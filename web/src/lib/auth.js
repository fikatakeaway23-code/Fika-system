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
  const token = sessionStorage.getItem('fika_token');
  if (!token) return false;

  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    clearSession();
    return false;
  }

  if (Date.now() >= payload.exp * 1000) {
    clearSession();
    return false;
  }

  return true;
}

export function getUser() {
  if (!hasValidToken()) return null;
  try {
    const raw = sessionStorage.getItem('fika_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return hasValidToken() ? sessionStorage.getItem('fika_token') : null;
}

export function setSession(user, token) {
  sessionStorage.setItem('fika_user', JSON.stringify(user));
  sessionStorage.setItem('fika_token', token);
}

export function clearSession() {
  sessionStorage.removeItem('fika_user');
  sessionStorage.removeItem('fika_token');
}

export function isLoggedIn() {
  return hasValidToken();
}

export function isOwner() {
  return getUser()?.role === 'owner';
}
