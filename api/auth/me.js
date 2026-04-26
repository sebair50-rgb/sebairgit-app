'use strict';

// GET /api/auth/me
// Returns current user from HttpOnly cookie — used for page-refresh verification
module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const cookies = parseCookies(req.headers.cookie || '');
  const hasToken = !!cookies['gh_token'];
  const rawUser  = cookies['gh_user'];

  if (!hasToken) {
    return res.status(200).json({ authenticated: false });
  }

  if (rawUser) {
    try {
      const user = JSON.parse(decodeURIComponent(rawUser));
      return res.status(200).json({ authenticated: true, user });
    } catch {}
  }

  // Token exists but user cookie missing — still authenticated
  return res.status(200).json({ authenticated: true, user: null });
};

function parseCookies(header) {
  const result = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      result[key] = val;
    }
  }
  return result;
}
