const TOKEN_KEY   = 'fika_member_token';
const ACCOUNT_KEY = 'fika_member_account';

export function getToken()          { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token)     { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken()        { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ACCOUNT_KEY); }
export function getAccount()        { try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY)); } catch { return null; } }
export function setAccount(account) { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); }
export function isLoggedIn()        { return Boolean(getToken()); }
