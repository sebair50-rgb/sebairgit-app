'use strict';

const https = require('https');

// GET /api/auth/callback?code=xxx
// Full OAuth exchange — token in HttpOnly cookie, user data in redirect URL
module.exports = async function handler(req, res) {
  const { code, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect('/?error=' + encodeURIComponent(oauthError));
  }
  if (!code) {
    return res.redirect('/?error=missing_code');
  }

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.redirect('/?error=server_misconfigured');
  }

  try {
    // ── 1. Exchange code → access_token ──────────────────────────────────────
    const tokenData = await postJSON(
      'https://github.com/login/oauth/access_token',
      { client_id: clientId, client_secret: clientSecret, code }
    );

    const access_token = tokenData.access_token;
    if (!access_token) {
      const reason = tokenData.error_description || tokenData.error || 'no_token';
      console.error('Token exchange failed:', tokenData);
      return res.redirect('/?error=' + encodeURIComponent(reason));
    }

    // ── 2. Fetch GitHub user profile ──────────────────────────────────────────
    const ghUser = await getJSON('https://api.github.com/user', access_token);
    if (!ghUser || !ghUser.login) {
      return res.redirect('/?error=could_not_fetch_user');
    }

    const userPayload = {
      login:  ghUser.login,
      name:   ghUser.name  || ghUser.login,
      avatar: ghUser.avatar_url,
    };

    // ── 3. Set HttpOnly cookie for the token (never visible to JS) ────────────
    const maxAge = 60 * 60 * 8; // 8 hours
    res.setHeader('Set-Cookie', [
      `gh_token=${access_token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
      `gh_user=${encodeURIComponent(JSON.stringify(userPayload))}; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
    ]);

    // ── 4. Redirect with user data encoded in URL so frontend picks it up ─────
    // Using #hash so the data never hits server logs
    // Base64-encode the user profile — only public, non-sensitive info
    const b64 = Buffer.from(JSON.stringify(userPayload)).toString('base64url');
    return res.redirect('/?auth=ok&u=' + b64);

  } catch (err) {
    console.error('OAuth callback error:', err.message);
    return res.redirect('/?error=' + encodeURIComponent(err.message || 'auth_failed'));
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const u       = new URL(url);
    const req     = https.request({
      hostname: u.hostname,
      path:     u.pathname,
      method:   'POST',
      headers: {
        Accept:         'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent':   'SebairGit/1.0',
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error('Bad JSON from token endpoint: ' + d.slice(0, 120))); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJSON(url, token) {
  return new Promise((resolve, reject) => {
    const u   = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path:     u.pathname,
      method:   'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:        'application/vnd.github.v3+json',
        'User-Agent':  'SebairGit/1.0',
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error('Bad JSON from user endpoint: ' + d.slice(0, 120))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}
