/**
 * GET    /api/history        — fetch user's upload history
 * DELETE /api/history        — clear all user's history
 * DELETE /api/history?id=xxx — delete single entry
 */
'use strict';

const { verifyToken } = require('./_jwt');
const db              = require('./_db');

module.exports = async function handler(req, res) {
  setCORS(res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const userId = decoded.userId;
  if (!userId) return res.status(401).json({ error: 'Invalid token — no userId.' });

  try {
    if (req.method === 'GET') {
      // Fetch history + stats in parallel
      const [uploads, stats] = await Promise.all([
        db.getUploads(userId, 50),
        db.getUserStats(userId),
      ]);
      return res.end(JSON.stringify({ uploads: uploads || [], stats }));
    }

    if (req.method === 'DELETE') {
      const uploadId = req.query?.id || new URL(req.url, 'http://x').searchParams.get('id');
      if (uploadId) {
        await db.deleteUpload(uploadId, userId);
        return res.end(JSON.stringify({ success: true, deleted: uploadId }));
      }
      await db.clearUploads(userId);
      return res.end(JSON.stringify({ success: true, cleared: true }));
    }

    res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[history] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  'https://sebairgit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}
