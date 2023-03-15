import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import { ServerResponse } from "http";
import devUserJson from "../fixtures/devUser.json";

interface Env {
  DB: D1Database;
}

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8'
  }
}

const errorResponse = (error: string) => new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<unknown, any, PluginData> = async ({
  data, env
}) => {
  const pluginEnabled = typeof data.cloudflareAccess !== "undefined";
  const jwtIdentity = pluginEnabled ?
    await data.cloudflareAccess.JWT.getIdentity() :
    devUserJson

  // does this provider exist? User & Identity? lazy initialize everything

  const providerQuery = env.DB.prepare(`
    SELECT ROWID, * FROM Providers WHERE CFProviderID = ?
  `);

  let provider = await providerQuery.bind(jwtIdentity.idp.id).first();

  if (provider === null)  {
    const { success } = await env.DB.prepare(`
      INSERT INTO Providers (ProviderName, CFProviderId) values (?, ?)
    `).bind(jwtIdentity.idp.type, jwtIdentity.idp.id).run()

    if (!success) {
      return errorResponse("unable to insert new IDP");
    } else {
      provider = await providerQuery.bind(jwtIdentity.idp.id).first();
    }
  }

  const identityQuery = env.DB.prepare(`
    SELECT * FROM Identities, Providers, Users
    WHERE CFProviderID = ?
      AND Users.ID = UserID
      AND Providers.ID = ?
      AND ProviderIdentityID = ?
  `).bind(jwtIdentity.idp.id, provider.ID, jwtIdentity.user_uuid);
  const identity = await identityQuery.first();

  if (identity === null) {
    // Check if email already exists, if it does, suggest login with orig provider.
    // Why? Users will forget which provider they logged in with,
    // and if their data disappears because they switch providers, they are unhappy.

    const existingUser = await env.DB.prepare(`
      SELECT * FROM  Identities, Providers, Users
      WHERE Email = ?
        AND Users.ID = UserID
        AND Providers.ID = ProviderID
    `).bind(jwtIdentity.email).first();

    if (existingUser) return errorResponse(`
      A user already signed up with this email address using ${existingUser.ProviderName}.
      Was it you? If it was you, try logging in with ${existingUser.ProviderName} instead.
    `);

    const results = await env.DB.batch([
      env.DB.prepare(`INSERT INTO Users (DisplayName, Email) values (?, ?)`)
        .bind(jwtIdentity.name, jwtIdentity.email),
      env.DB.prepare(`INSERT INTO Identities (ProviderID, UserID, ProviderIdentityID) values (?, last_insert_rowid(), ?)`)
        .bind(provider.ID, jwtIdentity.user_uuid)
    ])

    if (!results[1].success) return errorResponse("unable to insert new  User & Identity mapping");
  }

  return new Response(JSON.stringify(identity || jwtIdentity, null, 2), JsonHeader);
};
