'use strict';

// GET /api/auth/login
// Redirects user to GitHub OAuth authorization page
module.exports = function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'Server misconfigured: missing GITHUB_CLIENT_ID.' });
  }

  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: 'https://sebairgit-app.vercel.app/api/auth/callback',
    scope:        'repo user',
    state:        Math.random().toString(36).slice(2), // CSRF protection
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};
