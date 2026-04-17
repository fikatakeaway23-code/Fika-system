export function getUser() {
  try {
    const raw = sessionStorage.getItem('fika_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return sessionStorage.getItem('fika_token');
}

export function getRefreshToken() {
  return sessionStorage.getItem('fika_refresh_token');
}

export function setRefreshToken(token) {
  sessionStorage.setItem('fika_refresh_token', token);
}

export function clearRefreshToken() {
  sessionStorage.removeItem('fika_refresh_token');
}

export function setSession(user, token, refreshToken) {
  sessionStorage.setItem('fika_user', JSON.stringify(user));
  sessionStorage.setItem('fika_token', token);
  if (refreshToken) sessionStorage.setItem('fika_refresh_token', refreshToken);
}

export function clearSession() {
  sessionStorage.removeItem('fika_user');
  sessionStorage.removeItem('fika_token');
  sessionStorage.removeItem('fika_refresh_token');
}

export function isLoggedIn() {
  return !!getToken();
}

export function isOwner() {
  return getUser()?.role === 'owner';
}
