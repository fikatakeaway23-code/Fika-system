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

export function setSession(user, token) {
  sessionStorage.setItem('fika_user', JSON.stringify(user));
  sessionStorage.setItem('fika_token', token);
}

export function clearSession() {
  sessionStorage.removeItem('fika_user');
  sessionStorage.removeItem('fika_token');
}

export function isLoggedIn() {
  return !!getToken();
}

export function isOwner() {
  return getUser()?.role === 'owner';
}
