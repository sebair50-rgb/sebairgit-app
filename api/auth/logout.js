'use strict';
/** GET /api/auth/logout — clears all auth cookies */
module.exports = function handler(req, res) {
  const CLEAR = 'HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
  res.setHeader('Set-Cookie', [
    `gh_token=; ${CLEAR}`,
    `gh_user=;  Secure; SameSite=Lax; Path=/; Max-Age=0`,
  ]);
  res.writeHead(302, { Location: 'https://sebairgit-app.vercel.app/' });
  res.end();
};
