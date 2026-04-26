'use strict';

// GET /api/auth/logout
// Clears auth cookies and redirects to homepage
module.exports = function handler(req, res) {
  res.setHeader('Set-Cookie', [
    'gh_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
    'gh_user=;  Secure; SameSite=Lax; Path=/; Max-Age=0',
  ]);
  res.redirect('/');
};
