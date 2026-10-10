// "Continue with Google / GitHub" — OAuth authorization-code flow, no extra libraries.
// Flow: /api/auth/:provider → provider consent screen → /api/auth/:provider/callback
//       → find or create the user by verified email → back to the client with our JWT.
const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const { signToken } = require('../middleware/requireAuth');

const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    async profile(headers) {
      const p = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers }).then((r) => r.json());
      return p.email_verified && { email: p.email, name: p.name };
    },
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    async profile(headers) {
      const [user, emails] = await Promise.all(
        ['user', 'user/emails'].map((path) => fetch(`https://api.github.com/${path}`, { headers }).then((r) => r.json()))
      );
      const email = Array.isArray(emails) && emails.find((e) => e.primary && e.verified)?.email;
      return email && { email, name: user.name || user.login };
    },
  },
};

const clientId = (name) => process.env[`${name.toUpperCase()}_CLIENT_ID`];
const clientSecret = (name) => process.env[`${name.toUpperCase()}_CLIENT_SECRET`];
const clientUrl = () => process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:3000';
const callbackUrl = (name) => `${process.env.API_URL || `http://localhost:${process.env.PORT || 5001}`}/api/auth/${name}/callback`;

// The client lands on /auth/callback; the token stays in the URL fragment, which never reaches any server or log.
const finish = (res, params) => res.redirect(`${clientUrl()}/auth/callback#${new URLSearchParams(params)}`);

// GET /api/auth/:provider — start sign-in
router.get('/:provider', (req, res) => {
  const name = req.params.provider;
  const provider = PROVIDERS[name];
  if (!provider) return res.status(404).json({ error: 'Unknown sign-in provider' });
  // The buttons always show, so a provider without keys (e.g. local dev) explains itself instead of failing.
  if (!clientId(name) || !clientSecret(name)) return finish(res, { error: 'This sign-in option isn’t set up yet. Use email instead.' });

  // Random state in a short-lived cookie stops other sites from completing a login in your browser.
  // The cookie also carries the "remember me" choice (state.1 / state.0) through the round trip.
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', `${state}.${req.query.remember === '1' ? 1 : 0}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
    path: '/api/auth',
  });
  const params = new URLSearchParams({
    client_id: clientId(name),
    redirect_uri: callbackUrl(name),
    response_type: 'code',
    scope: provider.scope,
    state,
    prompt: 'select_account',
  });
  res.redirect(`${provider.authorizeUrl}?${params}`);
});

// GET /api/auth/:provider/callback — provider sends the user back here
router.get('/:provider/callback', async (req, res) => {
  const name = req.params.provider;
  const provider = PROVIDERS[name];
  const [savedState, remember] = req.headers.cookie?.match(/(?:^|;\s*)oauth_state=([^;]+)/)?.[1].split('.') || [];
  res.clearCookie('oauth_state', { path: '/api/auth' });

  if (!provider || !req.query.code) return finish(res, { error: 'Sign-in was cancelled.' });
  if (!savedState || savedState !== req.query.state) return finish(res, { error: 'Sign-in expired. Please try again.' });

  try {
    const tokens = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId(name),
        client_secret: clientSecret(name),
        code: req.query.code,
        redirect_uri: callbackUrl(name),
        grant_type: 'authorization_code',
      }),
    }).then((r) => r.json());
    if (!tokens.access_token) throw new Error(tokens.error_description || tokens.error || 'No access token');

    const profile = await provider.profile({ Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'IntervYou' });
    if (!profile) return finish(res, { error: `Your ${name} account has no verified email address.` });

    // Same email = same account, whether it signed up with a password, Google or GitHub.
    const email = profile.email.toLowerCase();
    let { rows } = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (!rows[0]) {
      ({ rows } = await db.query('INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id', [
        (profile.name || email.split('@')[0]).slice(0, 120),
        email,
      ]));
    }
    finish(res, { token: signToken(rows[0].id, remember === '1') });
  } catch (err) {
    console.error(`${name} sign-in failed:`, err.message);
    finish(res, { error: 'Sign-in failed. Please try again.' });
  }
});

module.exports = router;
