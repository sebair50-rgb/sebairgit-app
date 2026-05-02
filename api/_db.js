/**
 * Supabase database client — server-side only.
 * Uses service role key (bypasses RLS). NEVER sent to frontend.
 *
 * Tables:
 *  sg_users    — GitHub user profiles
 *  sg_sessions — server-side sessions (UUID returned to client)
 *  sg_uploads  — upload history per user
 */
'use strict';

const https = require('https');

const SUPABASE_URL  = process.env.SUPABASE_URL  || 'https://bgbherphlqebbmdalywi.supabase.co';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY;   // set in Vercel env vars

// ── Low-level REST helper ────────────────────────────────────────────────────
function dbRequest(method, path, body = null) {
  // Re-read env var at call time (supports test env changes)
  const key = process.env.SUPABASE_SERVICE_KEY;
  return new Promise((resolve, reject) => {
    if (!key) {
      return reject(new Error('SUPABASE_SERVICE_KEY env var not set'));
    }
    const url = new URL(SUPABASE_URL + '/rest/v1/' + path);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'apikey':        key,
      'Authorization': 'Bearer ' + key,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = https.request(
      { hostname: url.hostname, path: url.pathname + url.search, method, headers },
      res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          if (res.statusCode >= 400) {
            let errMsg = `DB error ${res.statusCode}`;
            try { errMsg = JSON.parse(d).message || errMsg; } catch {}
            return reject(Object.assign(new Error(errMsg), { status: res.statusCode }));
          }
          try {
            resolve(d ? JSON.parse(d) : null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Users ────────────────────────────────────────────────────────────────────

async function upsertUser({ login, name, avatar }) {
  const rows = await dbRequest(
    'POST',
    'sg_users?on_conflict=github_login',
    { github_login: login, name: name || login, avatar_url: avatar || '', last_seen: new Date().toISOString() }
  );
  return Array.isArray(rows) ? rows[0] : rows;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

async function createSession({ userId, login, ip, userAgent }) {
  const rows = await dbRequest('POST', 'sg_sessions', {
    user_id:      userId,
    github_login: login,
    ip:           ip || null,
    user_agent:   (userAgent || '').slice(0, 200),
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function getSession(sessionId) {
  const rows = await dbRequest(
    'GET',
    `sg_sessions?id=eq.${sessionId}&expires_at=gt.${new Date().toISOString()}&select=*,sg_users(*)&limit=1`
  );
  if (!rows || rows.length === 0) return null;
  const s = rows[0];
  return {
    sessionId:   s.id,
    userId:      s.user_id,
    login:       s.github_login,
    expiresAt:   s.expires_at,
    user: s.sg_users ? {
      login:  s.sg_users.github_login,
      name:   s.sg_users.name,
      avatar: s.sg_users.avatar_url,
    } : null,
  };
}

async function deleteSession(sessionId) {
  await dbRequest('DELETE', `sg_sessions?id=eq.${sessionId}`);
}

async function deleteUserSessions(userId) {
  await dbRequest('DELETE', `sg_sessions?user_id=eq.${userId}`);
}

async function cleanExpiredSessions() {
  await dbRequest('DELETE', `sg_sessions?expires_at=lt.${new Date().toISOString()}`);
}

// ── GitHub token storage (stored in session via JWT — accessed server-side) ──
// The GitHub OAuth token is never stored in DB (only in the signed JWT)
// The JWT is in memory on the client — never persisted

// ── Uploads ──────────────────────────────────────────────────────────────────

async function saveUpload({ userId, login, fileName, fileSize, repoUrl, repoName, owner, fileCount, expectedCount, verified, commitSha, elapsedMs, status, error }) {
  const rows = await dbRequest('POST', 'sg_uploads', {
    user_id:        userId,
    github_login:   login,
    file_name:      fileName,
    file_size:      fileSize || 0,
    repo_url:       repoUrl || null,
    repo_name:      repoName || null,
    owner:          owner || null,
    file_count:     fileCount || 0,
    expected_count: expectedCount || 0,
    verified:       verified || false,
    commit_sha:     commitSha || null,
    elapsed_ms:     elapsedMs || null,
    status:         status || 'success',
    error:          error || null,
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function getUploads(userId, limit = 50) {
  return dbRequest(
    'GET',
    `sg_uploads?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`
  ) || [];
}

async function deleteUpload(uploadId, userId) {
  // userId ensures users can only delete their own records
  await dbRequest('DELETE', `sg_uploads?id=eq.${uploadId}&user_id=eq.${userId}`);
}

async function clearUploads(userId) {
  await dbRequest('DELETE', `sg_uploads?user_id=eq.${userId}`);
}

async function getUserStats(userId) {
  const rows = await dbRequest(
    'GET',
    `sg_uploads?user_id=eq.${userId}&select=file_count,verified,status`
  ) || [];
  return {
    total:      rows.length,
    files:      rows.reduce((s, r) => s + (r.file_count || 0), 0),
    successful: rows.filter(r => r.verified).length,
  };
}

module.exports = {
  upsertUser,
  createSession, getSession, deleteSession, deleteUserSessions, cleanExpiredSessions,
  saveUpload, getUploads, deleteUpload, clearUploads, getUserStats,
};
