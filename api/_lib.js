'use strict';
/**
 * Shared server utilities — Vercel API routes only.
 * Supabase via REST, JWT verified locally (HS256).
 */
const https   = require('https');
const crypto  = require('crypto');

const SUPA_URL   = process.env.SUPABASE_URL || 'https://bgbherphlqebbmdalywi.supabase.co';
const APP_URL    = 'https://sebairgit-app.vercel.app';

// ── CORS headers ───────────────────────────────────────────────────────────
function setCORS(res, methods = 'GET, POST, DELETE, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin',  APP_URL);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

// ── JWT verify (HS256 — same secret as Edge Functions) ─────────────────────
function verifyJWT(authHeader) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw Object.assign(new Error('JWT_SECRET not configured'), { status: 500 });
  if (!authHeader?.startsWith('Bearer '))
    throw Object.assign(new Error('Missing or malformed Authorization header'), { status: 401 });

  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3)
    throw Object.assign(new Error('Malformed token'), { status: 401 });

  const [headerB64, payloadB64, sigB64] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  if (expected !== sigB64)
    throw Object.assign(new Error('Invalid token'), { status: 401 });

  let payload;
  try { payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()); }
  catch { throw Object.assign(new Error('Malformed token payload'), { status: 401 }); }

  if (payload.exp && payload.exp * 1000 < Date.now())
    throw Object.assign(new Error('Token expired — please refresh your session'), { status: 401 });

  return payload;
}

// ── Supabase REST helper ────────────────────────────────────────────────────
function supa(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!key) return reject(new Error('SUPABASE_SERVICE_KEY not set'));
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: new URL(SUPA_URL).hostname,
      path:     '/rest/v1/' + path,
      method,
      headers: {
        apikey:          key,
        Authorization:  'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer:         'return=representation',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          let msg = `Supabase ${res.statusCode}: ${path}`;
          try { msg = JSON.parse(d).message || msg; } catch {}
          return reject(Object.assign(new Error(msg), { status: res.statusCode }));
        }
        try { resolve(d ? JSON.parse(d) : null); } catch { resolve(null); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Database helpers ────────────────────────────────────────────────────────
const db = {
  async getUser(userId) {
    const rows = await supa('GET', `users?id=eq.${userId}&select=id,github_login,name,avatar_url,plan,uploads_count,files_pushed,bytes_uploaded&limit=1`);
    return rows?.[0] || null;
  },

  async getPlanLimits(plan = 'free') {
    const rows = await supa('GET', `plan_limits?plan=eq.${encodeURIComponent(plan)}&limit=1`);
    return rows?.[0] || { max_file_bytes: 41943040, max_files: 500, max_uploads_day: 10 };
  },

  async todayUploadCount(userId) {
    const today = new Date().toISOString().split('T')[0];
    const rows  = await supa('GET', `uploads?user_id=eq.${userId}&created_at=gte.${today}T00:00:00Z&select=id`);
    return (rows || []).length;
  },

  async saveUpload(data) {
    const rows = await supa('POST', 'uploads', data);
    return Array.isArray(rows) ? rows[0] : rows;
  },

  async updateUpload(id, data) {
    await supa('PATCH', `uploads?id=eq.${id}`, data);
  },

  async incrementStats(userId, fileCount, bytes) {
    // Use Supabase RPC
    await supa('POST', 'rpc/increment_user_stats', {
      p_user_id: userId, p_files: fileCount, p_bytes: bytes,
    }).catch(async () => {
      // Fallback: manual increment
      const rows = await supa('GET', `users?id=eq.${userId}&select=uploads_count,files_pushed,bytes_uploaded&limit=1`);
      const u = rows?.[0]; if (!u) return;
      await supa('PATCH', `users?id=eq.${userId}`, {
        uploads_count:  (u.uploads_count  || 0) + 1,
        files_pushed:   (u.files_pushed   || 0) + fileCount,
        bytes_uploaded: (u.bytes_uploaded || 0) + bytes,
      });
    });
  },

  async getUploads(userId, limit = 50) {
    return supa('GET',
      `uploads?user_id=eq.${userId}&order=created_at.desc&limit=${limit}` +
      `&select=id,original_name,file_size_bytes,file_count,repo_name,repo_url,` +
      `repo_owner,branch,commit_sha,status,error_message,duration_ms,created_at`
    ) || [];
  },

  async deleteUpload(uploadId, userId) {
    await supa('DELETE', `uploads?id=eq.${uploadId}&user_id=eq.${userId}`);
  },

  async clearUploads(userId) {
    await supa('DELETE', `uploads?user_id=eq.${userId}`);
  },

  async getUserStats(userId) {
    const rows = await supa('GET', `uploads?user_id=eq.${userId}&select=file_count,status,file_size_bytes`) || [];
    return {
      total:      rows.length,
      files:      rows.reduce((s, r) => s + (r.file_count || 0), 0),
      bytes:      rows.reduce((s, r) => s + (r.file_size_bytes || 0), 0),
      successful: rows.filter(r => r.status === 'success').length,
    };
  },
};

module.exports = { setCORS, verifyJWT, supa, db, APP_URL };
