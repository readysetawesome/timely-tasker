import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import type { Env } from "../lib/Identity"
import { GetIdentity } from "../lib/Identity"
import { PagesFunction } from "@cloudflare/workers-types";

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8'
  }
}

const errorResponse = (error: string) => new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<Env, any, PluginData> = async ({
  data, env
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
      WHERE Email = ?
        AND Users.ID = UserID
        AND Providers.ID = ProviderID
    `);

    const existingUser: any = await userQuery.bind(jwtIdentity.email).first();

    if (existingUser) return errorResponse(`
      A user already signed up with this email address using ${existingUser.ProviderName}.
      Was it you? If it was you, try logging in with ${existingUser.ProviderName} instead.
    `);

    const batch = await env.DB.batch([
      env.DB.prepare(`INSERT INTO Users (DisplayName, Email) values (?, ?)`)
        .bind(jwtIdentity.name, jwtIdentity.email),
      env.DB.prepare(`INSERT INTO Identities (ProviderID, UserID, ProviderIdentityID) values (?, last_insert_rowid(), ?)`)
        .bind(provider.ID, jwtIdentity.user_uuid),
      env.DB.prepare(`
        SELECT * FROM Identities, Providers, Users
        WHERE Users.ID = UserID
          AND Providers.ID = ProviderID
          AND Identities.ID = last_insert_rowid()
      `),
    ])

    if (!batch[1].success) return errorResponse("unable to insert new  User & Identity mapping");

    identity = batch[2].results?.[0];
  }

  return new Response(JSON.stringify(identity, null, 2), JsonHeader);
};
