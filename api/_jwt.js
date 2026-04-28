/**
 * Shared JWT utilities — used by all API endpoints.
 * Zero cookie usage. Token lives only in Authorization header.
 */
'use strict';

const jwt = require('jsonwebtoken');

const SECRET  = process.env.JWT_SECRET;
const EXPIRES = '8h';

/**
 * Sign a JWT containing safe public user data.
 * @param {{ login: string, name: string, avatar: string, ghToken: string }} payload
 */
function signToken(payload) {
  if (!SECRET) throw new Error('JWT_SECRET env var not set');
  return jwt.sign(
    {
      login:   payload.login,
      name:    payload.name,
      avatar:  payload.avatar,
      ghToken: payload.ghToken,   // GitHub OAuth token — never sent to frontend directly
    },
    SECRET,
    { expiresIn: EXPIRES, algorithm: 'HS256' }
  );
}

/**
 * Verify and decode a JWT from an Authorization: Bearer <token> header.
 * Returns decoded payload or throws.
 */
function verifyToken(authHeader) {
  if (!SECRET) throw new Error('JWT_SECRET env var not set');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const e = new Error('Missing or malformed Authorization header');
    e.status = 401;
    throw e;
  }
  const token = authHeader.slice(7).trim();
  try {
    return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const e = new Error(err.name === 'TokenExpiredError' ? 'Token expired — please login again' : 'Invalid token');
    e.status = 401;
    throw e;
  }
}

/**
 * Express-style middleware — attaches decoded user to req.user.
 * Call next(err) if invalid.
 */
function requireAuth(req, res, next) {
  try {
    req.user = verifyToken(req.headers.authorization);
    next();
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message });
  }
}

module.exports = { signToken, verifyToken, requireAuth };
