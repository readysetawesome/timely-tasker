import type { PluginData } from '@cloudflare/pages-plugin-cloudflare-access';
import type { Env, AppIdentity } from '../lib/Identity';
import { GetIdentity } from '../lib/Identity';

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
  },
};

const errorResponse = (error: string) =>
  new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<Env, never, PluginData> = async ({
  data,
  env,
}) => {
  const result = await GetIdentity(data, env);
  let { identity } = result;
  const { jwtIdentity, provider, error } = result;

  if (error) return errorResponse(error);

  if (identity === null) {
    // Check if email already exists, if it does, suggest login with orig provider.
    // Why? Users will forget which provider they logged in with.
    // If their data "disappears" because they switch providers, they are confused.

    const userQuery = env.DB.prepare(`
      SELECT * FROM  Identities, Providers, Users
      WHERE email = ?
        AND Users.id = userId
        AND Providers.id = providerId
    `);

    const existingUser = await userQuery
      .bind(jwtIdentity.email)
      .first<AppIdentity>();

    if (existingUser)
      return errorResponse(`
      A user already signed up with this email address using ${existingUser.providerName}.
      Was it you? If it was you, try logging in with ${existingUser.providerName} instead.
    `);

    if (provider === undefined)
      return errorResponse('Unable to find/intialize provider record.');

    const batch = await env.DB.batch<AppIdentity>([
      env.DB.prepare(
        `INSERT INTO Users (displayName, email) values (?, ?)`
      ).bind(jwtIdentity.name || '', jwtIdentity.email),
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
  }

  return new Response(JSON.stringify(identity, null, 2), JsonHeader);
};
