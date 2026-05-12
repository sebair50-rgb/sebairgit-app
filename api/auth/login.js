'use strict';
/**
 * GET /api/auth/login
 * Redirects to GitHub OAuth.
 * Callback goes directly to Supabase Edge Function (auth-callback).
 */
const SUPA_CALLBACK = 'https://bgbherphlqebbmdalywi.supabase.co/functions/v1/auth-callback';
const APP_URL       = 'https://sebairgit-app.vercel.app';

module.exports = function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    res.writeHead(302, { Location: `${APP_URL}/?error=server_misconfigured` });
    return res.end();
  }
  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: SUPA_CALLBACK,
    scope:        'repo user',
    state:        require('crypto').randomBytes(16).toString('hex'),
  });
  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params}` });
  res.end();
};
