import { Env, TASKER_COOKIE, parseCookies, AppIdentity } from '../lib/Identity';

import jwtDecode from 'jwt-decode';

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
  },
};

const errorResponse = (error: string) =>
  new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<Env, never> = async ({
  env,
  request,
}) => {
  /* 
    Returning from google's oauth request flow.
    1. exchange code for tokens
  */
  const { searchParams } = new URL(request.url);

  if (searchParams.get('code') === null)
    return errorResponse('missing code for token exchange');

  if (searchParams.get('state') === null)
    return errorResponse('missing state (XSRF preventive) for token exchange');

  const taskerCookies = parseCookies(request);
  if (taskerCookies[TASKER_COOKIE] !== searchParams.get('state')) {
    return errorResponse(
      `state parameter [${searchParams.get(
        'state'
      )}] does not match cookie [via ${request.headers.get('Cookie')}]`
    );
  }

  const response = await fetch(
    'https://accounts.google.com/.well-known/openid-configuration'
  );
  const { token_endpoint } = await response.json<{ token_endpoint: string }>();

  const tokenResponse = await fetch(token_endpoint, {
    method: 'POST',
    body: JSON.stringify({
      code: searchParams.get('code'),
      client_id: env.GOOGLE_OAUTH_CLIENT,
      client_secret: env.GOOGLE_OAUTH_SECRET,
      redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  const { id_token } = await tokenResponse.json<{ id_token: string }>();

  // This is server context, we called google direct over TLS, no need to validate further
  if (id_token && id_token !== '') {
    // 2. find or lazy init identity/user records
    const { email, sub } = jwtDecode<{ email: string; sub: string }>(id_token);

    const userQuery = env.DB.prepare(`
      SELECT * FROM Identities, Providers, Users
      WHERE Identities.providerIdentityId = ?
        AND Users.id = userId
        AND Providers.id = providerId
        AND Providers.providerName = 'google'
    `);

    let user: AppIdentity | undefined = await userQuery
      .bind(sub)
      .first<AppIdentity>();

    if (!user) {
      const batch = await env.DB.batch<AppIdentity>([
        env.DB.prepare(
          `INSERT INTO Users (displayName, email) VALUES (?, ?)`
        ).bind(email, email),
        env.DB.prepare(
          `INSERT INTO Identities (providerId, userId, providerIdentityId)
            VALUES ((SELECT id from Providers WHERE providerName='google'), last_insert_rowid(), ?)`
        ).bind(sub),
        env.DB.prepare(`
          SELECT * FROM Identities, Providers, Users
          WHERE Users.id = userId
            AND Providers.id = providerId
            AND Identities.id = last_insert_rowid()
        `),
      ]);

      if (!batch[1].success)
        return errorResponse('unable to insert new  User & Identity mapping');

      user = batch[2].results?.[0];
    }

    if (!user)
      return errorResponse(
        'unable to find newly inserted user/identity records'
      );

    // 3. insert new session based on securely random session id
    const mySession = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO UserSessions (userId, sessionId) VALUES (?, ?)`
    )
      .bind(user.id, mySession)
      .run();

    // 4. respond with a redirect that includes a same-origin, http-only cookie.
    return new Response(undefined, {
      headers: {
        'Set-Cookie': `${TASKER_COOKIE}=${mySession}; HttpOnly`,
        Location: '/',
      },
      status: 302,
    });
  } else {
    return new Response(undefined, {
      headers: {
        Location: '/oauth_callback_error',
      },
      status: 301,
    });
  }
};
