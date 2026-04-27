'use strict';
/**
 * GET /api/auth/me
 * Returns current authenticated user — used on page refresh.
 * Token stays in HttpOnly cookie, only public user data returned.
 */
module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const cookies  = parseCookies(req.headers.cookie || '');
  const hasToken = Boolean(cookies['gh_token']);
  const rawUser  = cookies['gh_user'];

  if (!hasToken) {
    return res.end(JSON.stringify({ authenticated: false }));
  }

  if (rawUser) {
    try {
      const user = JSON.parse(decodeURIComponent(rawUser));
      if (user && user.login) {
        return res.end(JSON.stringify({ authenticated: true, user }));
      }
    } catch { /* fall through */ }
  }

  res.end(JSON.stringify({ authenticated: true, user: null }));
};

function parseCookies(header) {
  const map = {};
  for (const chunk of header.split(';')) {
    const idx = chunk.indexOf('=');
    if (idx < 1) continue;
    map[chunk.slice(0, idx).trim()] = chunk.slice(idx + 1).trim();
  }
  return map;
}
