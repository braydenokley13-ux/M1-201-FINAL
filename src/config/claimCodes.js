export const CLAIM_CODES_BY_TIER = {
  TIER_1_CLEAR: "T1-M1-201-CLEAR",
  TIER_2_STRONG: "T2-M1-201-STRONG",
  TIER_3_ELITE: "T3-M1-201-ELITE"
};

export const CLAIM_CODES_BY_CLASS = {
  default: {
    TIER_1_CLEAR: "T1-M1-201-CLEAR",
    TIER_2_STRONG: "T2-M1-201-STRONG",
    TIER_3_ELITE: "T3-M1-201-ELITE"
  },
  "period-1": {
    TIER_1_CLEAR: "P1-T1-M1-201-CLEAR",
    TIER_2_STRONG: "P1-T2-M1-201-STRONG",
    TIER_3_ELITE: "P1-T3-M1-201-ELITE"
  },
  "period-2": {
    TIER_1_CLEAR: "P2-T1-M1-201-CLEAR",
    TIER_2_STRONG: "P2-T2-M1-201-STRONG",
    TIER_3_ELITE: "P2-T3-M1-201-ELITE"
  }
};

const CLAIM_CODE_OVERRIDE_KEY = "foc_m1_claim_code_overrides_v1";

function canUseStorage() {
  return typeof globalThis !== "undefined" && Boolean(globalThis.localStorage);
}

function safeReadOverrides() {
  if (!canUseStorage()) return {};
  try {
    const raw = globalThis.localStorage.getItem(CLAIM_CODE_OVERRIDE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function safeWriteOverrides(value) {
  if (!canUseStorage()) return false;
  try {
    globalThis.localStorage.setItem(CLAIM_CODE_OVERRIDE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getClaimCodeMapForClass(classProfileId = "default") {
  const base = CLAIM_CODES_BY_CLASS[classProfileId] || CLAIM_CODES_BY_CLASS.default;
  const overrides = safeReadOverrides();
  const classOverrides = overrides[classProfileId] && typeof overrides[classProfileId] === "object"
    ? overrides[classProfileId]
    : {};
  return {
    ...base,
    ...classOverrides
  };
}

export function resolveClaimCodeForTier(tier, classProfileId = "default") {
  const map = getClaimCodeMapForClass(classProfileId);
  return map[tier] || CLAIM_CODES_BY_TIER[tier] || "";
}

export function saveClaimCodeMapForClass(classProfileId = "default", nextMap = {}) {
  const overrides = safeReadOverrides();
  const existing = overrides[classProfileId] && typeof overrides[classProfileId] === "object"
    ? overrides[classProfileId]
    : {};
  overrides[classProfileId] = {
    ...existing,
    ...nextMap
  };
  safeWriteOverrides(overrides);
  return getClaimCodeMapForClass(classProfileId);
}

export function resetClaimCodeMapForClass(classProfileId = "default") {
  const overrides = safeReadOverrides();
  delete overrides[classProfileId];
  safeWriteOverrides(overrides);
  return getClaimCodeMapForClass(classProfileId);
}
