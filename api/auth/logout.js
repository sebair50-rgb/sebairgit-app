/**
 * POST /api/auth/logout
 * Deletes the session from Supabase — server-side invalidation.
 * No cookies set or cleared. Frontend drops JWT from memory.
 */
'use strict';

const { verifyToken } = require('../_jwt');
const db              = require('../_db');

module.exports = async function handler(req, res) {
  setCORS(res);
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const decoded = verifyToken(req.headers.authorization);
    if (decoded.sessionId) {
      await db.deleteSession(decoded.sessionId);
    }
    res.end(JSON.stringify({ success: true }));
  } catch {
    // Even if token is invalid, return success (idempotent logout)
    res.end(JSON.stringify({ success: true }));
  }
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  'https://sebairgit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}
