'use strict';
/**
 * GET /api/auth/callback?code=xxx
 *
 * GitHub sends user here after OAuth authorization.
 * 1. Exchange code for access_token  (server-side, secret never leaves)
 * 2. Fetch user profile
 * 3. Set HttpOnly cookie  (token, never readable by JS)
 * 4. Set readable cookie  (public user info only)
 * 5. Redirect to /?auth=ok&u=<standard-base64>
 *    Frontend decodes user from URL instantly — no second fetch needed.
 */
const https = require('https');

const APP_URL      = 'https://sebairgit-app.vercel.app';
const COOKIE_AGE   = 60 * 60 * 8; // 8 h
const COOKIE_FLAGS = `Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_AGE}`;

module.exports = async function handler(req, res) {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return redirect(res, `${APP_URL}/?error=${enc(oauthError)}`);
  }
  if (!code) {
    return redirect(res, `${APP_URL}/?error=missing_code`);
  }

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[callback] Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET env vars');
    return redirect(res, `${APP_URL}/?error=server_misconfigured`);
  }

  try {
    // ── Step 1: exchange code → access_token ──────────────────────────────
    const tokenRes = await post('https://github.com/login/oauth/access_token', {
      client_id:     clientId,
      client_secret: clientSecret,
      code,
    });

    if (!tokenRes.access_token) {
      const reason = tokenRes.error_description || tokenRes.error || 'no_token';
      console.error('[callback] Token exchange failed:', tokenRes);
      return redirect(res, `${APP_URL}/?error=${enc(reason)}`);
    }

    const token = tokenRes.access_token;

    // ── Step 2: fetch GitHub user ─────────────────────────────────────────
    const ghUser = await get('https://api.github.com/user', token);

    if (!ghUser || !ghUser.login) {
      console.error('[callback] Could not fetch user:', ghUser);
      return redirect(res, `${APP_URL}/?error=user_fetch_failed`);
    }

    const publicUser = {
      login:  ghUser.login,
      name:   ghUser.name || ghUser.login,
      avatar: ghUser.avatar_url || '',
    };

    // ── Step 3: set cookies ───────────────────────────────────────────────
    // HttpOnly = token never readable by JS (XSS protection)
    // Non-HttpOnly = user profile readable by JS (only public data)
    res.setHeader('Set-Cookie', [
      `gh_token=${token}; HttpOnly; ${COOKIE_FLAGS}`,
      `gh_user=${enc(JSON.stringify(publicUser))}; ${COOKIE_FLAGS}`,
    ]);

    // ── Step 4: redirect with user embedded in URL (standard base64) ──────
    // Using standard base64 (NOT base64url) so browser atob() works natively
    const b64 = Buffer.from(JSON.stringify(publicUser)).toString('base64');
    return redirect(res, `${APP_URL}/?auth=ok&u=${encodeURIComponent(b64)}`);

  } catch (err) {
    console.error('[callback] Unexpected error:', err.message);
    return redirect(res, `${APP_URL}/?error=${enc(err.message)}`);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function redirect(res, url) {
  res.writeHead(302, { Location: url });
  res.end();
}

function enc(s) {
  return encodeURIComponent(String(s).slice(0, 200));
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname, method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json',
                   'Content-Length': Buffer.byteLength(payload), 'User-Agent': 'SebairGit/1.0' } },
      (res) => {
        let d = '';
        res.on('data', c => (d += c));
        res.on('end', () => {
          try { resolve(JSON.parse(d)); }
          catch { reject(new Error('Bad JSON from token endpoint: ' + d.slice(0, 80))); }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname, method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json',
                   'User-Agent': 'SebairGit/1.0' } },
      (res) => {
        let d = '';
        res.on('data', c => (d += c));
        res.on('end', () => {
          try { resolve(JSON.parse(d)); }
          catch { reject(new Error('Bad JSON from user endpoint: ' + d.slice(0, 80))); }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}
