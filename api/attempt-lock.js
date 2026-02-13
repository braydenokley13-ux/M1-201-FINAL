import crypto from "node:crypto";

const STORE_KEY = "__foc_attempt_lock_store_v2";
const STATE_RECORD_KEY = "foc:m1:attempt_lock_state:v2";
const MAX_AUDIT_ENTRIES = 200;
const ACTIVE_KEY_ID = process.env.ATTEMPT_LOCK_ACTIVE_KEY_ID || process.env.ATTEMPT_LOCK_KEY_ID || "m1-attempt-lock-v1";
const SINGLE_PRIVATE_KEY_PEM = normalizePem(process.env.ATTEMPT_LOCK_PRIVATE_KEY_PEM || "");
const PRIVATE_KEYS_JSON = String(process.env.ATTEMPT_LOCK_PRIVATE_KEYS_JSON || "").trim();
const KV_REST_API_URL = String(process.env.KV_REST_API_URL || process.env.ATTEMPT_LOCK_REDIS_REST_URL || "").trim();
const KV_REST_API_TOKEN = String(process.env.KV_REST_API_TOKEN || process.env.ATTEMPT_LOCK_REDIS_REST_TOKEN || "").trim();
const DURABLE_REQUIRED = String(process.env.ATTEMPT_LOCK_DURABLE_REQUIRED || "").toLowerCase() === "true";

function normalizePem(value) {
  return String(value || "").replace(/\\n/g, "\n").trim();
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

function blankState() {
  return {
    locks: {},
    policyByClass: {},
    audit: []
  };
}

function normalizeState(state) {
  const fallback = blankState();
  if (!state || typeof state !== "object") {
    return fallback;
  }
  return {
    locks: state.locks && typeof state.locks === "object" ? state.locks : {},
    policyByClass: state.policyByClass && typeof state.policyByClass === "object" ? state.policyByClass : {},
    audit: Array.isArray(state.audit) ? state.audit : []
  };
}

function normalizeClassProfileId(classProfileId = "default") {
  const normalized = String(classProfileId || "default").trim();
  return normalized || "default";
}

function assertTeamId(teamId) {
  if (teamId !== "warriors" && teamId !== "knicks") {
    throw new Error("Invalid teamId.");
  }
}

function assertClassProfileId(classProfileId) {
  if (!/^[a-z0-9-]+$/i.test(classProfileId)) {
    throw new Error("Invalid classProfileId.");
  }
}

function makeScopeKey(classProfileId, teamId) {
  return `${classProfileId}:${teamId}`;
}

function hasDurableStoreConfig() {
  return Boolean(KV_REST_API_URL && KV_REST_API_TOKEN);
}

function assertDurableStoreConfigured() {
  if (DURABLE_REQUIRED && !hasDurableStoreConfig()) {
    throw new Error(
      "Durable attempt-lock store is required but not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN (or ATTEMPT_LOCK_REDIS_REST_URL/ATTEMPT_LOCK_REDIS_REST_TOKEN)."
    );
  }
}

async function kvFetch(path) {
  const url = `${KV_REST_API_URL.replace(/\/+$/, "")}${path}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${KV_REST_API_TOKEN}`
    }
  });
  if (!response.ok) {
    throw new Error(`KV request failed (${response.status})`);
  }
  return response.json();
}

async function kvGetJson(key) {
  const data = await kvFetch(`/get/${encodeURIComponent(key)}`);
  const raw = data?.result;
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "string") {
    return JSON.parse(raw);
  }
  return raw;
}

async function kvSetJson(key, value) {
  const serialized = JSON.stringify(value);
  await kvFetch(`/set/${encodeURIComponent(key)}/${encodeURIComponent(serialized)}`);
}

function getMemoryState() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = blankState();
  }
  return normalizeState(globalThis[STORE_KEY]);
}

function setMemoryState(state) {
  globalThis[STORE_KEY] = normalizeState(state);
}

async function loadState() {
  if (!hasDurableStoreConfig()) {
    return getMemoryState();
  }

  try {
    const remote = await kvGetJson(STATE_RECORD_KEY);
    if (!remote) {
      return blankState();
    }
    return normalizeState(remote);
  } catch (error) {
    if (DURABLE_REQUIRED) {
      throw new Error(`Durable store read failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    return getMemoryState();
  }
}

async function saveState(state) {
  const normalized = normalizeState(state);
  if (!hasDurableStoreConfig()) {
    setMemoryState(normalized);
    return;
  }

  try {
    await kvSetJson(STATE_RECORD_KEY, normalized);
  } catch (error) {
    if (DURABLE_REQUIRED) {
      throw new Error(`Durable store write failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setMemoryState(normalized);
  }
}

function parsePrivateKeyMap() {
  const keys = {};
  if (PRIVATE_KEYS_JSON) {
    try {
      const parsed = JSON.parse(PRIVATE_KEYS_JSON);
      if (parsed && typeof parsed === "object") {
        for (const [keyId, pem] of Object.entries(parsed)) {
          keys[keyId] = normalizePem(pem);
        }
      }
    } catch {
      // Ignore malformed JSON and fall back.
    }
  }
  if (SINGLE_PRIVATE_KEY_PEM) {
    keys[ACTIVE_KEY_ID] = SINGLE_PRIVATE_KEY_PEM;
  }
  return keys;
}

function getSigningMaterial() {
  const keyMap = parsePrivateKeyMap();
  const knownIds = Object.keys(keyMap);
  if (!knownIds.length) {
    return { keyId: ACTIVE_KEY_ID, privateKeyPem: "" };
  }
  if (keyMap[ACTIVE_KEY_ID]) {
    return { keyId: ACTIVE_KEY_ID, privateKeyPem: keyMap[ACTIVE_KEY_ID] };
  }
  return { keyId: knownIds[0], privateKeyPem: keyMap[knownIds[0]] };
}

function signPayload(payload) {
  const signing = getSigningMaterial();
  if (!signing.privateKeyPem) {
    return {
      signature: null,
      keyId: signing.keyId
    };
  }

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(stableStringify(payload));
  signer.end();
  return {
    signature: signer.sign(signing.privateKeyPem, "base64"),
    keyId: signing.keyId
  };
}

function makeEnvelope(data, nonce = "") {
  const payload = {
    data,
    nonce,
    issuedAt: new Date().toISOString()
  };
  const signed = signPayload(payload);
  return {
    payload,
    signature: signed.signature,
    algorithm: signed.signature ? "RSASSA-PKCS1-v1_5-SHA256" : "none",
    keyId: signed.keyId
  };
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  if (typeof req.body === "object") {
    return req.body;
  }
  return {};
}

function appendAudit(state, entry) {
  state.audit = [
    {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry
    },
    ...state.audit
  ].slice(0, MAX_AUDIT_ENTRIES);
  return state.audit[0];
}

function filterAudit(audit, teamId, limit = 20, classProfileId = "default") {
  const normalizedLimit = Math.max(1, Number(limit) || 20);
  const scopedClassProfileId = normalizeClassProfileId(classProfileId);
  if (!teamId) {
    return audit.filter((entry) => normalizeClassProfileId(entry.classProfileId || "default") === scopedClassProfileId).slice(0, normalizedLimit);
  }
  return audit
    .filter(
      (entry) =>
        (entry.teamId === teamId || entry.teamId === "global")
        && normalizeClassProfileId(entry.classProfileId || "default") === scopedClassProfileId
    )
    .slice(0, normalizedLimit);
}

function handleCanStart(state, payload) {
  const teamId = String(payload.teamId || "");
  const classProfileId = normalizeClassProfileId(payload.classProfileId || "default");
  const enforceLock = Boolean(payload.enforceLock);
  assertTeamId(teamId);
  assertClassProfileId(classProfileId);

  if (!enforceLock) {
    return { ok: true, lock: null };
  }

  const lock = state.locks[makeScopeKey(classProfileId, teamId)] || null;
  if (!lock) {
    return { ok: true, lock: null };
  }

  appendAudit(state, {
    action: "LOCK_BLOCKED",
    actor: "system",
    teamId,
    classProfileId,
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

function handleSetLock(state, payload) {
  const teamId = String(payload.teamId || "");
  const classProfileId = normalizeClassProfileId(payload.classProfileId || "default");
  assertTeamId(teamId);
  assertClassProfileId(classProfileId);

  const lockPayload = payload.lockPayload || {};
  const meta = payload.meta || {};
  const lock = {
    teamId,
    classProfileId,
    createdAt: new Date().toISOString(),
    ...lockPayload
  };
  state.locks[makeScopeKey(classProfileId, teamId)] = lock;

  const auditEntry = appendAudit(state, {
    action: "LOCK_SET",
    actor: meta.actor || "system",
    teamId,
    classProfileId,
    status: lock.status || "UNKNOWN",
    tier: lock.tier || "NONE",
    claimCode: lock.claimCode || "",
    note: meta.note || ""
  });

  return { lock, auditEntry };
}

function handleClearLock(state, payload) {
  const teamId = String(payload.teamId || "");
  const classProfileId = normalizeClassProfileId(payload.classProfileId || "default");
  assertTeamId(teamId);
  assertClassProfileId(classProfileId);

  const meta = payload.meta || {};
  const scopeKey = makeScopeKey(classProfileId, teamId);
  const existing = state.locks[scopeKey] || null;
  const hadLock = Boolean(existing);
  delete state.locks[scopeKey];

  const auditEntry = appendAudit(state, {
    action: hadLock ? "LOCK_CLEARED" : "LOCK_CLEAR_ATTEMPT",
    actor: meta.actor || "teacher",
    teamId,
    classProfileId,
    status: existing?.status || "NONE",
    tier: existing?.tier || "NONE",
    claimCode: existing?.claimCode || "",
    note: meta.note || (hadLock ? "Manual teacher reset." : "No lock existed to clear.")
  });

  return { hadLock, existing, auditEntry };
}

function handleGetPolicy(state, payload) {
  const classProfileId = normalizeClassProfileId(payload.classProfileId || "default");
  assertClassProfileId(classProfileId);
  const defaultValue = Boolean(payload.defaultValue);
  const policy = state.policyByClass[classProfileId];
  if (typeof policy?.enabled !== "boolean") {
    state.policyByClass[classProfileId] = {
      enabled: defaultValue,
      updatedAt: new Date().toISOString(),
      classProfileId
    };
  }
  return state.policyByClass[classProfileId].enabled;
}

function handleSetPolicy(state, payload) {
  const classProfileId = normalizeClassProfileId(payload.classProfileId || "default");
  assertClassProfileId(classProfileId);
  const enabled = Boolean(payload.enabled);
  const meta = payload.meta || {};

  const policy = {
    enabled,
    updatedAt: new Date().toISOString(),
    classProfileId
  };
  state.policyByClass[classProfileId] = policy;

  const auditEntry = appendAudit(state, {
    action: "LOCK_POLICY_CHANGED",
    actor: meta.actor || "teacher",
    teamId: meta.teamId || "global",
    classProfileId,
    status: enabled ? "STRICT_ON" : "STRICT_OFF",
    tier: "NONE",
    claimCode: "",
    note: meta.note || `Strict lock ${enabled ? "enabled" : "disabled"}.`
  });

  return { policy, auditEntry };
}

function handleGetAudit(state, payload) {
  const teamId = payload.teamId ? String(payload.teamId) : "";
  const classProfileId = normalizeClassProfileId(payload.classProfileId || "default");
  assertClassProfileId(classProfileId);
  const limit = payload.limit;
  return filterAudit(state.audit, teamId, limit, classProfileId);
}

function executeCommand(state, command, payload) {
  if (command === "can_start") return handleCanStart(state, payload);
  if (command === "set_lock") return handleSetLock(state, payload);
  if (command === "clear_lock") return handleClearLock(state, payload);
  if (command === "get_policy") return handleGetPolicy(state, payload);
  if (command === "set_policy") return handleSetPolicy(state, payload);
  if (command === "get_audit") return handleGetAudit(state, payload);
  throw new Error("Unknown command.");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "Method not allowed." });
    return;
  }

  try {
    assertDurableStoreConfigured();
    const body = parseBody(req);
    const command = String(body.command || "");
    const payload = body.payload || {};
    const nonce = String(body.nonce || "");
    const state = await loadState();
    const data = executeCommand(state, command, payload);
    await saveState(state);
    const envelope = makeEnvelope(data, nonce);

    res.status(200).json({
      ok: true,
      envelope,
      storage: hasDurableStoreConfig() ? "durable" : "memory-fallback"
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown request error."
    });
  }
}
