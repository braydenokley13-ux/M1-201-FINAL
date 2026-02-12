const LOCK_KEY_PREFIX = "foc_m1_attempt_lock_v1";

function makeKey(teamId) {
  return `${LOCK_KEY_PREFIX}:${teamId}`;
}

export function getAttemptLock(teamId) {
  try {
    const raw = localStorage.getItem(makeKey(teamId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAttemptLock(teamId, payload) {
  const lock = {
    teamId,
    createdAt: new Date().toISOString(),
    ...payload
  };

  try {
    localStorage.setItem(makeKey(teamId), JSON.stringify(lock));
  } catch {
    // # TODO(APP-003): Add non-localStorage fallback for private browsing contexts.
  }

  return lock;
}

export function clearAttemptLock(teamId) {
  try {
    localStorage.removeItem(makeKey(teamId));
  } catch {
    // No-op
  }
}

export function canStartAttempt(teamId, enforceLock = false) {
  if (!enforceLock) {
    return { ok: true, lock: null };
  }

  const lock = getAttemptLock(teamId);
  if (!lock) {
    return { ok: true, lock: null };
  }

  return {
    ok: false,
    lock,
    reason: "This team already used its graded attempt on this browser profile."
  };
}

// # TODO(APP-004): Replace client-side lock with signed server verification for exam integrity.
