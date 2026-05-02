/**
 * GET /api/auth/callback?code=xxx
 *
 * Full OAuth flow — ZERO browser storage:
 * 1. Exchange code → GitHub access_token
 * 2. Fetch GitHub user profile
 * 3. Upsert user in Supabase sg_users
 * 4. Create server-side session in Supabase sg_sessions
 * 5. Sign JWT containing: sessionId + public user info + ghToken
 * 6. Redirect to /?token=JWT  (frontend holds in React state ONLY)
 */
'use strict';

const https         = require('https');
const { signToken } = require('../_jwt');
const db            = require('../_db');

const APP_URL = 'https://sebairgit-app.vercel.app';

module.exports = async function handler(req, res) {
  const { code, error: oauthError } = req.query;

  if (oauthError) return redir(res, `${APP_URL}/?error=${enc(oauthError)}`);
  if (!code)      return redir(res, `${APP_URL}/?error=missing_code`);

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('[callback] Missing GitHub OAuth env vars');
    return redir(res, `${APP_URL}/?error=server_misconfigured`);
  }

  try {
    // ── 1. Exchange code → GitHub token ───────────────────────────────────
    const tokenRes = await post('https://github.com/login/oauth/access_token', {
      client_id: clientId, client_secret: clientSecret, code,
    });

    if (!tokenRes.access_token) {
      console.error('[callback] Token exchange failed:', tokenRes);
      return redir(res, `${APP_URL}/?error=${enc(tokenRes.error_description || tokenRes.error || 'no_token')}`);
    }

    // ── 2. Fetch GitHub user ───────────────────────────────────────────────
    const ghUser = await get('https://api.github.com/user', tokenRes.access_token);
    if (!ghUser?.login) {
      return redir(res, `${APP_URL}/?error=user_fetch_failed`);
    }

    // ── 3. Upsert user in Supabase ─────────────────────────────────────────
    const ip        = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
    const userAgent = req.headers['user-agent'] || '';
    const dbUser    = await db.upsertUser({
      login:  ghUser.login,
      name:   ghUser.name || ghUser.login,
      avatar: ghUser.avatar_url || '',
    });

    // ── 4. Create server-side session ──────────────────────────────────────
    const session = await db.createSession({
      userId:    dbUser.id,
      login:     ghUser.login,
      ip,
      userAgent,
    });

    // ── 5. Sign JWT (sessionId + ghToken + public user info) ───────────────
    // ghToken is inside JWT — never stored in DB, never sent to frontend directly
    // sessionId links to Supabase session for server-side validation & history
    const jwt = signToken({
      sessionId: session.id,
      userId:    dbUser.id,
      login:     ghUser.login,
      name:      ghUser.name || ghUser.login,
      avatar:    ghUser.avatar_url || '',
      ghToken:   tokenRes.access_token,
    });

    // ── 6. Redirect — token in URL, frontend stores in React state ONLY ────
    return redir(res, `${APP_URL}/?token=${encodeURIComponent(jwt)}`);

  } catch (err) {
    console.error('[callback] Error:', err.message);
    return redir(res, `${APP_URL}/?error=${enc(err.message)}`);
  }
};

function redir(res, url) { res.writeHead(302, { Location: url }); res.end(); }
function enc(s) { return encodeURIComponent(String(s).slice(0, 200)); }

function post(url, body) {
  return new Promise((resolve, reject) => {
    const p = JSON.stringify(body);
    const u = new URL(url);
    const r = https.request({ hostname:u.hostname, path:u.pathname, method:'POST',
      headers:{ Accept:'application/json','Content-Type':'application/json','Content-Length':Buffer.byteLength(p),'User-Agent':'SebairGit/1.0' }},
      res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{reject(new Error('Bad JSON: '+d.slice(0,80)))} }); });
    r.on('error',reject); r.write(p); r.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const r = https.request({ hostname:u.hostname, path:u.pathname, method:'GET',
      headers:{ Authorization:`Bearer ${token}`, Accept:'application/vnd.github.v3+json','User-Agent':'SebairGit/1.0' }},
      res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve(JSON.parse(d))}catch{reject(new Error('Bad JSON: '+d.slice(0,80)))} }); });
    r.on('error',reject); r.end();
  });
}
