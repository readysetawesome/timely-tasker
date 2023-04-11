import { Env, AppIdentity, TASKER_COOKIE } from '../lib/Identity';
import crypto from 'crypto';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

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
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_OAUTH_CLIENT,
    env.GOOGLE_OAUTH_SECRET
  );

  const { searchParams } = new URL(request.url);
  if (searchParams.get('code') === null)
    return errorResponse('missing code for token exchange');

  const { tokens } = await oauth2Client.getToken(
    searchParams.get('code') ?? ''
  );

  // This is server context, we called google direct over TLS, no need to validate further
  if (tokens.id_token) {
    // 2. find or lazy init identity/user records
    const { email, subject } = new JWT(tokens.id_token);
    const userQuery = env.DB.prepare(`
      SELECT * FROM  Identities, Providers, Users
      WHERE Identities.providerIdentityId = ?
        AND Users.id = userId
        AND Providers.id = providerId
        AND Provider.name = 'google'
    `);

    let user: AppIdentity | undefined = await userQuery
      .bind(subject)
      .first<AppIdentity>();

    if (!user) {
      const batch = await env.DB.batch<AppIdentity>([
        env.DB.prepare(
          `INSERT INTO Users (displayName, email) values (?, ?)`
        ).bind(email, email),
        env.DB.prepare(
          `
          INSERT INTO Identities (providerId, userId, providerIdentityId)
            VALUES ((SELECT providerId from Providers WHERE name='google'), last_insert_rowid(), ?)`
        ).bind(subject),
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

    // 3. insert new session based on securely random session id
    const mySession = crypto.randomBytes(48).toString('base64');
    env.DB.prepare(`
      INSERT INTO UserSessions (userId, sessionId) VALUES (?, ?)`
    )
      .bind(user?.id, mySession)
      .run();

    // 4. respond with a redirect that includes a same-origin, http-only cookie.
    return new Response(undefined, {
      headers: {
        'Set-Cookie': `${TASKER_COOKIE}=${mySession} HttpOnly`,
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
