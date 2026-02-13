const LOCK_KEY_PREFIX = "foc_m1_attempt_lock_v1";
const AUDIT_KEY = "foc_m1_attempt_lock_audit_v1";
const POLICY_KEY = "foc_m1_attempt_lock_policy_v1";
const MAX_AUDIT_ENTRIES = 120;
const PROBE_KEY = "foc_m1_storage_probe_v1";
const memoryStore = new Map();
let activeStoreName = null;
const verifyKeyPromiseById = new Map();

const SERVER_MODE = String(import.meta.env?.VITE_ATTEMPT_LOCK_SERVER_MODE || "auto").toLowerCase();
const SERVER_ENDPOINT = String(import.meta.env?.VITE_ATTEMPT_LOCK_API_URL || "/api/attempt-lock");
const SERVER_TIMEOUT_MS = Number(import.meta.env?.VITE_ATTEMPT_LOCK_SERVER_TIMEOUT_MS || 3500);
const VERIFY_PUBLIC_KEY_PEM = normalizePem(import.meta.env?.VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEY_PEM || "");
const VERIFY_PUBLIC_KEYS_JSON = String(import.meta.env?.VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEYS_JSON || "").trim();
const VERIFY_PUBLIC_KEY_ID = String(
  import.meta.env?.VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEY_ID || import.meta.env?.VITE_ATTEMPT_LOCK_KEY_ID || "m1-attempt-lock-v1"
).trim() || "m1-attempt-lock-v1";
const ALLOW_UNSIGNED_DEV = String(import.meta.env?.VITE_ATTEMPT_LOCK_ALLOW_UNSIGNED_DEV || "").toLowerCase() === "true";
const VERIFY_PUBLIC_KEY_MAP = buildVerifyPublicKeyMap();

function normalizePem(value) {
  return String(value || "").replace(/\\n/g, "\n").trim();
}

function isServerModeRequired() {
  return SERVER_MODE === "required";
}

function shouldTryServer() {
  return SERVER_MODE !== "off";
}

function normalizeClassProfileId(classProfileId = "default") {
  const value = String(classProfileId || "default").trim();
  return value || "default";
}

function makeKey(teamId, classProfileId = "default") {
  return `${LOCK_KEY_PREFIX}:${normalizeClassProfileId(classProfileId)}:${teamId}`;
}

function makePolicyKey(classProfileId = "default") {
  return `${POLICY_KEY}:${normalizeClassProfileId(classProfileId)}`;
}

function stableSort(value) {
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = stableSort(value[key]);
    }
    return sorted;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableSort(value));
}

function createWebStore(name, storage) {
  return {
    name,
    getItem(key) {
      return storage.getItem(key);
    },
    setItem(key, value) {
      storage.setItem(key, value);
    },
    removeItem(key) {
      storage.removeItem(key);
    }
  };
}

const memoryFallbackStore = {
  name: "memory",
  getItem(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  setItem(key, value) {
    memoryStore.set(key, value);
  },
  removeItem(key) {
    memoryStore.delete(key);
  }
};

function listStores() {
  const stores = [];
  const scope = typeof globalThis !== "undefined" ? globalThis : {};

  if (scope.localStorage) {
    stores.push(createWebStore("localStorage", scope.localStorage));
  }
  if (scope.sessionStorage) {
    stores.push(createWebStore("sessionStorage", scope.sessionStorage));
  }

  stores.push(memoryFallbackStore);
  return stores;
}

function orderStoresByActive(stores) {
  if (!activeStoreName) {
    return stores;
  }

  const active = stores.find((store) => store.name === activeStoreName);
  if (!active) {
    return stores;
  }

  return [active, ...stores.filter((store) => store.name !== activeStoreName)];
}

function probeStore(store) {
  try {
    const token = `${Date.now()}-${Math.random()}`;
    store.setItem(PROBE_KEY, token);
    const readBack = store.getItem(PROBE_KEY);
    store.removeItem(PROBE_KEY);
    return readBack === token;
  } catch {
    return false;
  }
}

function ensureActiveStore() {
  if (activeStoreName) {
    return;
  }

  const stores = listStores();
  const available = stores.find((store) => probeStore(store));
  activeStoreName = available ? available.name : "memory";
}

function withStoreRead(key) {
  ensureActiveStore();
  const stores = orderStoresByActive(listStores());

  for (const store of stores) {
    try {
      const value = store.getItem(key);
      if (value !== null && value !== undefined) {
        activeStoreName = store.name;
        return value;
      }
    } catch {
      // Try next store
    }
  }

  return null;
}

function withStoreWrite(key, value) {
  ensureActiveStore();
  const stores = orderStoresByActive(listStores());

  for (const store of stores) {
    try {
      store.setItem(key, value);
      activeStoreName = store.name;
      return true;
    } catch {
      // If write fails, try to clear stale values for this key.
      try {
        store.removeItem(key);
      } catch {
        // Ignore and continue.
      }
    }
  }

  return false;
}

function withStoreRemove(key) {
  let removed = false;
  const stores = listStores();

  for (const store of stores) {
    try {
      store.removeItem(key);
      removed = true;
    } catch {
      // Ignore and continue.
    }
  }

  return removed;
}

function decodeBase64(input) {
  const normalized = String(input).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const binary = globalThis.atob ? globalThis.atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function pemToDerArrayBuffer(pem) {
  const body = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body) {
    throw new Error("Missing attempt-lock verify public key.");
  }
  return decodeBase64(body);
}

function buildVerifyPublicKeyMap() {
  const keyMap = {};

  if (VERIFY_PUBLIC_KEYS_JSON) {
    let parsed;
    try {
      parsed = JSON.parse(VERIFY_PUBLIC_KEYS_JSON);
    } catch {
      throw new Error("VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEYS_JSON must be valid JSON.");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEYS_JSON must be an object map of keyId -> PEM.");
    }

    for (const [keyId, pem] of Object.entries(parsed)) {
      const normalizedKeyId = String(keyId || "").trim();
      const normalizedPem = normalizePem(pem);
      if (normalizedKeyId && normalizedPem) {
        keyMap[normalizedKeyId] = normalizedPem;
      }
    }
  }

  if (VERIFY_PUBLIC_KEY_PEM) {
    keyMap[VERIFY_PUBLIC_KEY_ID] = VERIFY_PUBLIC_KEY_PEM;
  }

  return keyMap;
}

function resolveVerifyKeyId(envelopeKeyId = "") {
  const knownKeyIds = Object.keys(VERIFY_PUBLIC_KEY_MAP);
  if (!knownKeyIds.length) {
    throw new Error(
      "No attempt-lock verify public keys configured. Set VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEYS_JSON or VITE_ATTEMPT_LOCK_VERIFY_PUBLIC_KEY_PEM."
    );
  }

  const normalizedEnvelopeKeyId = String(envelopeKeyId || "").trim();
  if (normalizedEnvelopeKeyId) {
    if (!VERIFY_PUBLIC_KEY_MAP[normalizedEnvelopeKeyId]) {
      throw new Error(`Unknown attempt-lock signature keyId "${normalizedEnvelopeKeyId}".`);
    }
    return normalizedEnvelopeKeyId;
  }

  if (knownKeyIds.length === 1) {
    return knownKeyIds[0];
  }

  if (VERIFY_PUBLIC_KEY_MAP.default) {
    return "default";
  }

  throw new Error("Signed server response did not include keyId, but multiple verify keys are configured.");
}

async function getVerifyKey(keyId) {
  const resolvedKeyId = resolveVerifyKeyId(keyId);
  if (verifyKeyPromiseById.has(resolvedKeyId)) {
    return verifyKeyPromiseById.get(resolvedKeyId);
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error("WebCrypto subtle API not available for signature verification.");
  }

  const der = pemToDerArrayBuffer(VERIFY_PUBLIC_KEY_MAP[resolvedKeyId]);
  const verifyKeyPromise = globalThis.crypto.subtle.importKey(
    "spki",
    der,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  verifyKeyPromiseById.set(resolvedKeyId, verifyKeyPromise);
  return verifyKeyPromise;
}

async function verifyEnvelopeSignature(envelope, nonce) {
  const payload = envelope?.payload;
  if (!payload || typeof payload !== "object") {
    throw new Error("Missing signed payload in server response.");
  }

  if (payload.nonce !== nonce) {
    throw new Error("Server signature nonce mismatch.");
  }

  const signature = envelope.signature;
  if (!signature) {
    if (ALLOW_UNSIGNED_DEV && import.meta.env?.DEV) {
      return payload.data;
    }
    throw new Error("Unsigned server response is not allowed.");
  }

  const key = await getVerifyKey(envelope.keyId);
  const dataBytes = new TextEncoder().encode(stableStringify(payload));
  const signatureBytes = decodeBase64(signature);
  const isValid = await globalThis.crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    signatureBytes,
    dataBytes
  );
  if (!isValid) {
    throw new Error("Invalid server signature for attempt-lock payload.");
  }

  return payload.data;
}

async function postServerCommand(command, payload) {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(500, SERVER_TIMEOUT_MS));

  try {
    const response = await fetch(SERVER_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command, payload, nonce }),
      signal: controller.signal
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) {
      const reason = json?.error || `HTTP ${response.status}`;
      throw new Error(`Attempt-lock server rejected command (${reason}).`);
    }

    if (!json.envelope) {
      throw new Error("Missing response envelope from attempt-lock server.");
    }

    return verifyEnvelopeSignature(json.envelope, nonce);
  } finally {
    clearTimeout(timeout);
  }
}

function appendServerFallbackAudit(command, payload, error) {
  const teamId = payload?.teamId || payload?.meta?.teamId || "global";
  const classProfileId = normalizeClassProfileId(payload?.classProfileId || payload?.meta?.classProfileId || "default");
  appendAuditEntry({
    action: "SERVER_FALLBACK",
    actor: "system",
    teamId,
    classProfileId,
    status: "LOCAL_FALLBACK",
    tier: "NONE",
    claimCode: "",
    note: `${command}: ${error instanceof Error ? error.message : "unknown error"}`
  });
}

async function runWithServer(command, payload, localFn) {
  if (!shouldTryServer()) {
    return localFn();
  }

  try {
    return await postServerCommand(command, payload);
  } catch (error) {
    if (isServerModeRequired()) {
      throw error;
    }
    appendServerFallbackAudit(command, payload, error);
    return localFn();
  }
}

function safeReadJson(key, fallback) {
  try {
    const raw = withStoreRead(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJson(key, value) {
  try {
    return withStoreWrite(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

function appendAuditEntry(entry) {
  const current = safeReadJson(AUDIT_KEY, []);
  const next = [
    {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry
    },
    ...current
  ].slice(0, MAX_AUDIT_ENTRIES);
  safeWriteJson(AUDIT_KEY, next);
  return next[0];
}

export function getAttemptLock(teamId, classProfileId = "default") {
  return safeReadJson(makeKey(teamId, classProfileId), null);
}

export function getAttemptLockPolicy(defaultValue = false, classProfileId = "default") {
  const policy = safeReadJson(makePolicyKey(classProfileId), null);
  if (!policy || typeof policy.enabled !== "boolean") {
    return Boolean(defaultValue);
  }
  return policy.enabled;
}

export function setAttemptLockPolicy(enabled, meta = {}, classProfileId = "default") {
  const normalized = Boolean(enabled);
  const scopedClassProfileId = normalizeClassProfileId(classProfileId);
  const policy = {
    enabled: normalized,
    updatedAt: new Date().toISOString(),
    classProfileId: scopedClassProfileId
  };

  const saved = safeWriteJson(makePolicyKey(scopedClassProfileId), policy);
  if (!saved) return { policy, auditEntry: null };

  const auditEntry = appendAuditEntry({
    action: "LOCK_POLICY_CHANGED",
    actor: meta.actor || "teacher",
    teamId: meta.teamId || "global",
    classProfileId: scopedClassProfileId,
    status: normalized ? "STRICT_ON" : "STRICT_OFF",
    tier: "NONE",
    claimCode: "",
    note: meta.note || `Strict lock ${normalized ? "enabled" : "disabled"}.`
  });

  return { policy, auditEntry };
}

export function setAttemptLock(teamId, payload, meta = {}, classProfileId = "default") {
  const scopedClassProfileId = normalizeClassProfileId(classProfileId);
  const lock = {
    teamId,
    classProfileId: scopedClassProfileId,
    createdAt: new Date().toISOString(),
    ...payload
  };

  const saved = safeWriteJson(makeKey(teamId, scopedClassProfileId), lock);
  if (!saved) return { lock, auditEntry: null };

  const auditEntry = appendAuditEntry({
    action: "LOCK_SET",
    actor: meta.actor || "system",
    teamId,
    classProfileId: scopedClassProfileId,
    status: lock.status || "UNKNOWN",
    tier: lock.tier || "NONE",
    claimCode: lock.claimCode || "",
    note: meta.note || ""
  });

  return { lock, auditEntry };
}

export function clearAttemptLock(teamId, meta = {}, classProfileId = "default") {
  const scopedClassProfileId = normalizeClassProfileId(classProfileId);
  const existing = getAttemptLock(teamId, scopedClassProfileId);
  const hadLock = Boolean(existing);

  withStoreRemove(makeKey(teamId, scopedClassProfileId));

  const auditEntry = appendAuditEntry({
    action: hadLock ? "LOCK_CLEARED" : "LOCK_CLEAR_ATTEMPT",
    actor: meta.actor || "teacher",
    teamId,
    classProfileId: scopedClassProfileId,
    status: existing?.status || "NONE",
    tier: existing?.tier || "NONE",
    claimCode: existing?.claimCode || "",
    note: meta.note || (hadLock ? "Manual teacher reset." : "No lock existed to clear.")
  });

  return { hadLock, existing, auditEntry };
}

export function getAttemptAuditLog(teamId, limit = 20) {
  return getAttemptAuditLogScoped(teamId, limit, "default");
}

export function getAttemptAuditLogScoped(teamId, limit = 20, classProfileId = "default") {
  const entries = safeReadJson(AUDIT_KEY, []);
  const scopedClassProfileId = normalizeClassProfileId(classProfileId);
  const filtered = teamId
    ? entries.filter(
        (entry) =>
          (entry.teamId === teamId || entry.teamId === "global")
          && normalizeClassProfileId(entry.classProfileId || "default") === scopedClassProfileId
      )
    : entries.filter((entry) => normalizeClassProfileId(entry.classProfileId || "default") === scopedClassProfileId);
  return filtered.slice(0, Math.max(1, limit));
}

export function canStartAttempt(teamId, enforceLock = false, classProfileId = "default") {
  if (!enforceLock) {
    return { ok: true, lock: null };
  }

  const scopedClassProfileId = normalizeClassProfileId(classProfileId);
  const lock = getAttemptLock(teamId, scopedClassProfileId);
  if (!lock) {
    return { ok: true, lock: null };
  }

  appendAuditEntry({
    action: "LOCK_BLOCKED",
    actor: "system",
    teamId,
    classProfileId: scopedClassProfileId,
    status: lock.status || "UNKNOWN",
    tier: lock.tier || "NONE",
    claimCode: lock.claimCode || "",
    note: "Attempt blocked because lock enforcement is enabled."
  });

  return {
    ok: false,
    lock,
    reason: "This team already used its graded attempt on this browser profile."
  };
}

export async function getAttemptLockPolicySecure(defaultValue = false, classProfileId = "default") {
  return runWithServer(
    "get_policy",
    { defaultValue, classProfileId },
    () => getAttemptLockPolicy(defaultValue, classProfileId)
  );
}

export async function setAttemptLockPolicySecure(enabled, meta = {}, classProfileId = "default") {
  return runWithServer(
    "set_policy",
    { enabled, meta, classProfileId },
    () => setAttemptLockPolicy(enabled, meta, classProfileId)
  );
}

export async function canStartAttemptSecure(teamId, enforceLock = false, classProfileId = "default") {
  return runWithServer(
    "can_start",
    { teamId, enforceLock, classProfileId },
    () => canStartAttempt(teamId, enforceLock, classProfileId)
  );
}

export async function setAttemptLockSecure(teamId, lockPayload, meta = {}, classProfileId = "default") {
  return runWithServer(
    "set_lock",
    { teamId, lockPayload, meta, classProfileId },
    () => setAttemptLock(teamId, lockPayload, meta, classProfileId)
  );
}

export async function clearAttemptLockSecure(teamId, meta = {}, classProfileId = "default") {
  return runWithServer(
    "clear_lock",
    { teamId, meta, classProfileId },
    () => clearAttemptLock(teamId, meta, classProfileId)
  );
}

export async function getAttemptAuditLogSecure(teamId, limit = 20, classProfileId = "default") {
  return runWithServer(
    "get_audit",
    { teamId, limit, classProfileId },
    () => getAttemptAuditLogScoped(teamId, limit, classProfileId)
  );
}
