'use strict';

// GET /api/auth/me
// Returns current authenticated user from cookie (no token exposed)
module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const cookies = parseCookies(req.headers.cookie || '');
  const rawUser = cookies['gh_user'];
  const hasToken = !!cookies['gh_token']; // just check existence, never send it

  if (!hasToken || !rawUser) {
    return res.status(200).json({ authenticated: false });
  }

  try {
    const user = JSON.parse(decodeURIComponent(rawUser));
    res.status(200).json({ authenticated: true, user });
  } catch {
    res.status(200).json({ authenticated: false });
  }
};

function parseCookies(header) {
  return Object.fromEntries(
    header.split(';').map(c => c.trim().split('=').map(p => p.trim()))
      .filter(p => p.length === 2)
  );
}
