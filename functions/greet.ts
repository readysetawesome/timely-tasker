import { Env, AppIdentity, parseCookies, TASKER_COOKIE } from '../lib/Identity';

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
        create session state
        respond with oAuth authorize url
      - cookie?
        respond with user email address
  */

  const cookies = parseCookies(request);

  if (!cookies[TASKER_COOKIE]) {
    // insert new session based on securely random session id
    // by keeping this on the client we provie a means to XSRF bust
    const mySession = crypto.randomUUID();
    const response = await fetch(
      'https://accounts.google.com/.well-known/openid-configuration'
    );
    const { authorization_endpoint } = await response.json<{
      authorization_endpoint: string;
    }>();
    const url = new URL(authorization_endpoint);
    url.search = [
      ['client_id', env.GOOGLE_OAUTH_CLIENT],
      ['response_type', 'code'],
      ['scope', 'openid email'],
      ['state', mySession],
      ['nonce', crypto.randomUUID()],
      ['redirect_uri', env.GOOGLE_OAUTH_REDIRECT_URI],
    ]
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    return new Response(JSON.stringify({ authorizeUrl: url }), {
      headers: {
        ...JsonHeader.headers,
        'Set-Cookie': `${TASKER_COOKIE}=${mySession}; HttpOnly`,
      },
    });
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

    return new Response(JSON.stringify({ identity: existingUser }), JsonHeader);
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
