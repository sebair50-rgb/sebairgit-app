/**
 * Shared JWT utilities — server-side only.
 * Token payload: sessionId + userId + login + name + avatar + ghToken
 * Zero browser storage. Token lives in React state only.
 */
'use strict';

const jwt = require('jsonwebtoken');

const SECRET  = process.env.JWT_SECRET;
const EXPIRES = '8h';

function signToken(payload) {
  if (!SECRET) throw new Error('JWT_SECRET env var not set');
  return jwt.sign(
    {
      sessionId: payload.sessionId || null,   // Supabase session UUID
      userId:    payload.userId    || null,   // Supabase user UUID
      login:     payload.login,
      name:      payload.name,
      avatar:    payload.avatar,
      ghToken:   payload.ghToken,             // GitHub OAuth token — server use only
    },
    SECRET,
    { expiresIn: EXPIRES, algorithm: 'HS256' }
  );
}

function verifyToken(authHeader) {
  if (!SECRET) throw new Error('JWT_SECRET env var not set');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const e = new Error('Missing or malformed Authorization header');
    e.status = 401; throw e;
  }
  const token = authHeader.slice(7).trim();
  try {
    return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    const e = new Error(
      err.name === 'TokenExpiredError'
        ? 'Token expired — please login again'
        : 'Invalid token'
    );
    e.status = 401; throw e;
  }
}

function requireAuth(req, res, next) {
  try {
    req.user = verifyToken(req.headers.authorization);
    next();
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message });
  }
}

module.exports = { signToken, verifyToken, requireAuth };
