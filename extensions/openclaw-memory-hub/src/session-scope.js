const SHARED_SEGMENTS = [":group:", ":channel:", ":room:", ":space:", ":topic:"];

function normalizeSessionKey(sessionKey) {
  return String(sessionKey ?? "").trim().toLowerCase();
}

export function inferSessionScope(sessionKey) {
  const normalized = normalizeSessionKey(sessionKey);
  const isMain = normalized === "main" || normalized.endsWith(":main");
  const isShared = SHARED_SEGMENTS.some((segment) => normalized.includes(segment));
  const isDirect = normalized.includes(":direct:") || normalized === "" || isMain;
  return {
    sessionKey: normalized,
    isMain,
    isShared,
    isDirect,
    chatType: isShared ? "shared" : "private",
  };
}

export function canAccessDurableMemory(sessionKey) {
  return !inferSessionScope(sessionKey).isShared;
}

export function canAccessSessionTranscript(currentSessionKey, requestedSessionKey) {
  const current = normalizeSessionKey(currentSessionKey);
  const requested = normalizeSessionKey(requestedSessionKey);
  if (!current || !requested) {
    return false;
  }
  return current === requested;
}
