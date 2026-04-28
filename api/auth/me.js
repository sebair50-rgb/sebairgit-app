/**
 * GET /api/auth/me
 * Validates JWT from Authorization: Bearer <token> header.
 * Returns public user info — NO cookies read or set.
 */
'use strict';

const { verifyToken } = require('../_jwt');

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    setCORS(res);
    return res.status(200).end();
  }

  setCORS(res);

  try {
    const decoded = verifyToken(req.headers.authorization);
    res.end(JSON.stringify({
      authenticated: true,
      user: {
        login:  decoded.login,
        name:   decoded.name,
        avatar: decoded.avatar,
        // ghToken is intentionally NOT returned
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
