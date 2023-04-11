import { Env, AppIdentity, parseCookies, TASKER_COOKIE } from '../lib/Identity';
import { google } from 'googleapis';

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
  },
};

export const onRequest: PagesFunction<Env, never> = async ({
  env,
  request,
}) => {
  /*
    get information about the session
      - no cookie?
        respond with oAuth authorize url
      - cookie?
        respond with user email address
  */

  const cookies = parseCookies(request);

  if (!cookies[TASKER_COOKIE]) {
    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_OAUTH_CLIENT,
      env.GOOGLE_OAUTH_SECRET,
      'https://preview-oauth.timely-tasker.pages.dev/callback'
    );

    const authorizeUrl = oauth2Client.generateAuthUrl({
      scope: ['openid', 'email'],
    });
    return new Response(JSON.stringify({ authorizeUrl }), JsonHeader);
  } else {
    // repond with authorized user email address from sesssion lookup
    const userQuery = env.DB.prepare(`
      SELECT * FROM  Identities, Providers, Users
      WHERE Users.id = userId
        AND Providers.id = providerId
        AND Users.id IN (SELECT userId from UserSessions where sessionId = ?)
    `);

    const existingUser = await userQuery
      .bind(cookies.timelyTaskerSession)
      .first<AppIdentity>();

    return new Response(
      JSON.stringify({
        email: existingUser.email,
        provider: existingUser.providerName,
      }),
      JsonHeader
    );
  }
};

/*
  const batch = await env.DB.batch<AppIdentity>([
    env.DB.prepare(`INSERT INTO Users (displayName, email) values (?, ?)`).bind(
      email,
      email
    ),
    env.DB.prepare(
      `INSERT INTO Identities (providerId, userId, providerIdentityId) values (?, last_insert_rowid(), ?)`
    ).bind(provider.id, jwtIdentity.user_uuid),
    env.DB.prepare(`
      SELECT * FROM Identities, Providers, Users
      WHERE Users.id = userId
        AND Providers.id = providerId
        AND Identities.id = last_insert_rowid()
    `),
  ]);

  if (!batch[1].success)
    return errorResponse('unable to insert new  User & Identity mapping');

  identity = batch[2].results?.[0];

  return new Response(JSON.stringify(identity, null, 2), JsonHeader);
};
*/
