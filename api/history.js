'use strict';
/**
 * GET    /api/history     — upload history + stats from Supabase
 * DELETE /api/history     — clear all
 * DELETE /api/history?id= — delete single entry
 */
const { setCORS, verifyJWT, db } = require('./_lib');

module.exports = async function handler(req, res) {
  setCORS(res, 'GET, DELETE, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let decoded;
  try { decoded = verifyJWT(req.headers.authorization); }
  catch (e) { return res.status(e.status || 401).json({ error: e.message }); }

  const userId = decoded.sub;
  if (!userId) return res.status(401).json({ error: 'Invalid token.' });

  try {
    if (req.method === 'GET') {
      const [uploads, stats] = await Promise.all([
        db.getUploads(userId, 50),
        db.getUserStats(userId),
      ]);
      return res.end(JSON.stringify({ uploads: uploads || [], stats }));
    }

    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      if (id) {
        await db.deleteUpload(id, userId);
        return res.end(JSON.stringify({ success: true, deleted: id }));
      }
      await db.clearUploads(userId);
      return res.end(JSON.stringify({ success: true }));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[history]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
