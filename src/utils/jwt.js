// Lightweight JWT helpers for role-based navigation and data retrieval

export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return {};
  }
}

export function getStoredToken() {
  return localStorage.getItem('token') || '';
}

export function getUserDataFromToken(token) {
  const jwt = token || getStoredToken();
  if (!jwt) return {};
  const payload = parseJwt(jwt);
  const username = payload.username || payload.sub || payload.email || undefined;
  const role = payload.role || payload.roles?.[0] || payload.scope || undefined;
  const user_id = payload.user_id || payload.uid || payload.id || undefined;
  return { username, role, user_id };
}

export function getUserRole() {
  // Prefer explicit userData if stored, fallback to JWT payload
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData && userData.role) return userData.role;
  } catch (_) {}
  const { role } = getUserDataFromToken();
  return role;
}
