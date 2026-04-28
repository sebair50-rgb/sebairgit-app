/**
 * GET /api/auth/login
 * Redirects to GitHub OAuth — no cookies, no state in server.
 */
'use strict';

const APP_URL = 'https://sebairgit-app.vercel.app';

module.exports = function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.writeHead(302, { Location: `${APP_URL}/?error=server_misconfigured` }), res.end();
  }
  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: `${APP_URL}/api/auth/callback`,
    scope:        'repo user',
    state:        require('crypto').randomBytes(16).toString('hex'),
  });
  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
  res.end();
};
