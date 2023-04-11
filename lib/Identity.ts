

export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  GOOGLE_OAUTH_CLIENT: string;
  GOOGLE_OAUTH_SECRET: string;
}

export type AppIdentity = {
  id: number;
  displayName: string;
  email: string;
  providerName: string;
  cfProviderId: string;
  providerId: number;
  userId: number;
  providerIdentityId: string;
};

export type Provider = {
  id: number;
  providerName: string;
  cfProviderId: string;
};

export type UserSession = {
  id: number;
  sessionId: string;
  userId: number;
};

export type IdentityResponse = {
  error?: string;
  identity?: AppIdentity;
  provider?: Provider;
  authorizeUrl?: string;
};

export const TASKER_COOKIE = 'timelyTaskerSession';
export type taskerCookies = {
  [TASKER_COOKIE]: string;
};

export const parseCookies = (request: Request): taskerCookies => {
  const cookieChunks = request.headers.get('Cookie').split(';');
  return cookieChunks.reduce((acc, cur) => {
    const [k, v] = cur.trim().split('=');
    if (k === TASKER_COOKIE) acc[k] = v;
    return acc;
  }, {}) as taskerCookies;
};

export const GetIdentity = async (
  request: Request,
  env: Env
): Promise<IdentityResponse> => {
  const isDevMode = env.ENVIRONMENT === 'development';
  const idp = 'google'; //only google supported for now
  let userId: number;
  const cookies = parseCookies(request);

  if (isDevMode) {
    userId = 1;
  } else {
    const { results, success } = await env.DB.prepare(
      `
      SELECT userId FROM UserSessions WHERE sessionId = ?
    `
    )
      .bind(cookies['timely-tasker-session'])
      .all<UserSession>();

    if (!success || results.length === 0) {
      return { error: 'invalid user session' };
    } else {
      userId = results[0].userId;
    }
  }

  const providerQuery = env.DB.prepare(`
    SELECT * FROM Providers WHERE providerName = ?
  `);

  let provider = await providerQuery.bind(idp).first<Provider>();

  if (provider === null) {
    // provider does not exist, lazy initialize

    const { success, results } = await env.DB.prepare(
      `
      INSERT INTO Providers (providerName) values (?) RETURNING *
    `
    )
      .bind(idp)
      .all<Provider>();

    if (!success) {
      return { error: 'unable to insert new IDP' };
    } else {
      provider = results[0];
    }
  }

  const identity = await env.DB.prepare(
    `
    SELECT * FROM Identities, Providers, Users
    WHERE providerName = ?
      AND Users.id = userId
      AND Providers.id = ?
      AND userId = ?
  `
  )
    .bind(idp, provider.id, userId)
    .first<AppIdentity>();

  return { identity, provider };
};
