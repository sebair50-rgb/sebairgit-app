'use strict';
/**
 * GET /api/auth/login
 * Redirects user to GitHub OAuth authorization page.
 * Used as fallback when VITE_GITHUB_CLIENT_ID is not set in frontend.
 */
const APP_URL = 'https://sebairgit-app.vercel.app';

module.exports = function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    console.error('[login] Missing GITHUB_CLIENT_ID env var');
    return res.writeHead(302, { Location: `${APP_URL}/?error=server_misconfigured` }), res.end();
  }

  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: `${APP_URL}/api/auth/callback`,
    scope:        'repo user',
    state:        Math.random().toString(36).slice(2),
  });

  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
  res.end();
};
