/**
 * GET /api/auth/callback?code=xxx
 *
 * Full OAuth flow — ZERO cookies:
 * 1. Exchange code → GitHub access_token
 * 2. Fetch GitHub user profile
 * 3. Sign our own JWT (contains ghToken + public user info)
 * 4. Redirect to /?token=JWT  (frontend reads & stores in localStorage)
 */
'use strict';

const https          = require('https');
const { signToken }  = require('../_jwt');

const APP_URL = 'https://sebairgit-app.vercel.app';

module.exports = async function handler(req, res) {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return redir(res, `${APP_URL}/?error=${enc(oauthError)}`);
  }
  if (!code) {
    return redir(res, `${APP_URL}/?error=missing_code`);
  }

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[callback] Missing GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET');
    return redir(res, `${APP_URL}/?error=server_misconfigured`);
  }

  try {
    // ── Step 1: exchange code → GitHub access_token ───────────────────────
    const tokenRes = await post('https://github.com/login/oauth/access_token', {
      client_id: clientId, client_secret: clientSecret, code,
    });

    if (!tokenRes.access_token) {
      const reason = tokenRes.error_description || tokenRes.error || 'no_token';
      console.error('[callback] Token exchange failed:', tokenRes);
      return redir(res, `${APP_URL}/?error=${enc(reason)}`);
    }

    // ── Step 2: fetch GitHub user ─────────────────────────────────────────
    const ghUser = await get('https://api.github.com/user', tokenRes.access_token);
    if (!ghUser?.login) {
      console.error('[callback] User fetch failed:', ghUser);
      return redir(res, `${APP_URL}/?error=user_fetch_failed`);
    }

    // ── Step 3: sign our own JWT ──────────────────────────────────────────
    const jwt = signToken({
      login:   ghUser.login,
      name:    ghUser.name || ghUser.login,
      avatar:  ghUser.avatar_url || '',
      ghToken: tokenRes.access_token,  // stored inside JWT, never exposed directly
    });

    // ── Step 4: redirect — token in URL query param (frontend stores it) ──
    // NO cookies, NO session — 100% stateless
    return redir(res, `${APP_URL}/?token=${encodeURIComponent(jwt)}`);

  } catch (err) {
    console.error('[callback] Error:', err.message);
    return redir(res, `${APP_URL}/?error=${enc(err.message)}`);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function redir(res, url) {
  res.writeHead(302, { Location: url });
  res.end();
}
function enc(s) { return encodeURIComponent(String(s).slice(0, 200)); }

function post(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const u       = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname, method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json',
                   'Content-Length': Buffer.byteLength(payload), 'User-Agent': 'SebairGit/1.0' } },
      r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('Bad JSON: ' + d.slice(0, 80))); } }); }
    );
    req.on('error', reject); req.write(payload); req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname, method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'SebairGit/1.0' } },
      r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('Bad JSON: ' + d.slice(0, 80))); } }); }
    );
    req.on('error', reject); req.end();
  });
}
