'use strict';

const https = require('https');

// GET /api/auth/callback?code=xxx
// Exchanges OAuth code for access_token, stores in HttpOnly cookie
module.exports = async function handler(req, res) {
  const { code, error: oauthError } = req.query;

  // Handle user denying OAuth
  if (oauthError) {
    console.log('OAuth denied by user:', oauthError);
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
    // Exchange code for access_token (server-side only)
    const tokenData = await postJSON('https://github.com/login/oauth/access_token', {
      client_id:     clientId,
      client_secret: clientSecret,
      code,
    });

    const access_token = tokenData.access_token;

    if (!access_token) {
      console.error('Token exchange failed:', tokenData);
      return res.redirect('/?error=token_exchange_failed');
    }

    // Fetch GitHub user profile to store username
    const user = await getJSON('https://api.github.com/user', access_token);

    // Store token in secure HttpOnly cookie (never readable by JS)
    // Also store username in a readable cookie for the UI
    const isProd  = process.env.NODE_ENV === 'production' || req.headers.host?.includes('vercel.app');
    const secure  = isProd ? 'Secure; ' : '';
    const maxAge  = 60 * 60 * 8; // 8 hours

    res.setHeader('Set-Cookie', [
      // HttpOnly: JS can NOT read this — contains the real token
      `gh_token=${access_token}; HttpOnly; ${secure}SameSite=Lax; Path=/; Max-Age=${maxAge}`,
      // Readable: JS CAN read this — only contains username (safe)
      `gh_user=${encodeURIComponent(JSON.stringify({ login: user.login, avatar: user.avatar_url, name: user.name || user.login }))}; ${secure}SameSite=Lax; Path=/; Max-Age=${maxAge}`,
    ]);

    // Redirect back to the app
    res.redirect('/?auth=success');

  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path:     u.pathname,
      method:   'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent':   'SebairGit/1.0',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from GitHub: ' + data.slice(0, 100))); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJSON(url, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path:     u.pathname + (u.search || ''),
      method:   'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/vnd.github.v3+json',
        'User-Agent':    'SebairGit/1.0',
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON: ' + data.slice(0, 100))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}
