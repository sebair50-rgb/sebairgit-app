/**
 * GET /api/auth/me
 * Validates JWT from Authorization: Bearer header.
 * Also validates session still exists in Supabase (not force-expired).
 * Returns public user info — zero browser storage touched.
 */
'use strict';

const { verifyToken } = require('../_jwt');
const db              = require('../_db');

module.exports = async function handler(req, res) {
  setCORS(res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const decoded = verifyToken(req.headers.authorization);

    // Verify session still exists in DB (allows server-side force-logout)
    if (decoded.sessionId) {
      const session = await db.getSession(decoded.sessionId);
      if (!session) {
        return res.status(401).json({ authenticated: false, error: 'Session expired or revoked.' });
      }
    }

    res.end(JSON.stringify({
      authenticated: true,
      user: {
        login:  decoded.login,
        name:   decoded.name,
        avatar: decoded.avatar,
        userId: decoded.userId,
      },
    }));
  } catch (err) {
    res.statusCode = err.status || 401;
    res.end(JSON.stringify({ authenticated: false, error: err.message }));
  }
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  'https://sebairgit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}
