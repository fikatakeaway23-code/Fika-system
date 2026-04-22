const TOKEN_KEY   = 'fika_member_token';
const ACCOUNT_KEY = 'fika_member_account';

function sessionStore() {
  return window.sessionStorage;
}

function legacyStore() {
  return window.localStorage;
}

function readValue(key) {
  const value = sessionStore().getItem(key);
  if (value !== null) return value;

  const legacyValue = legacyStore().getItem(key);
  if (legacyValue !== null) {
    sessionStore().setItem(key, legacyValue);
    legacyStore().removeItem(key);
  }
  return legacyValue;
}

function parseJwtPayload(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function hasValidToken() {
  const token = readValue(TOKEN_KEY);
  if (!token) return false;

  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    clearToken();
    return false;
  }

  if (Date.now() >= payload.exp * 1000) {
    clearToken();
    return false;
  }

  return true;
}

export function getToken()          { return hasValidToken() ? readValue(TOKEN_KEY) : null; }
export function setToken(token)     { sessionStore().setItem(TOKEN_KEY, token); legacyStore().removeItem(TOKEN_KEY); }
export function clearToken()        { sessionStore().removeItem(TOKEN_KEY); sessionStore().removeItem(ACCOUNT_KEY); legacyStore().removeItem(TOKEN_KEY); legacyStore().removeItem(ACCOUNT_KEY); }
export function getAccount()        { if (!hasValidToken()) return null; try { return JSON.parse(readValue(ACCOUNT_KEY)); } catch { return null; } }
export function setAccount(account) { sessionStore().setItem(ACCOUNT_KEY, JSON.stringify(account)); legacyStore().removeItem(ACCOUNT_KEY); }
export function updateAccount(patch) {
  const account = getAccount();
  if (!account) return;
  setAccount({ ...account, ...patch });
}
export function isLoggedIn()        { return hasValidToken(); }
