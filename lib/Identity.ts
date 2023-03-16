import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import type { D1Database } from "@cloudflare/workers-types";
import devUserJson from "../fixtures/devUser.json";

export interface Env {
  DB: D1Database;
}

export type Identity = {
  ID: number,
  DisplayName: string,
  Email: string,
  ProviderName: string,
  CFProviderID: string,
  ProviderID: number,
  UserID: number,
  ProviderIdentityID: string,
}

export type Provider = {
  ID: number,
  ProviderName: string,
  CFProviderID: string,
}

export type IdentityResponse = {
  error?: string,
  identity?: Identity,
  jwtIdentity?: any,
  provider?: any,
}

export const GetIdentity = async ( data: PluginData, env: Env ): Promise<IdentityResponse> =>  {
  const pluginEnabled = typeof data.cloudflareAccess !== "undefined";
  const jwtIdentity = pluginEnabled ?
    await data.cloudflareAccess.JWT.getIdentity() :
    devUserJson

  const providerQuery = env.DB.prepare(`
    SELECT * FROM Providers WHERE CFProviderID = ?
  `);

  let provider: any = await providerQuery.bind(jwtIdentity.idp.id).first<Provider>();

  if (provider === null)  {
    // provider does not exist, lazy initialize

    const { success } = await env.DB.prepare(`
      INSERT INTO Providers (ProviderName, CFProviderId) values (?, ?)
    `).bind(jwtIdentity.idp.type, jwtIdentity.idp.id).run();

    if (!success) {
      return { error: "unable to insert new IDP" };
    } else {
      provider = await providerQuery.bind(jwtIdentity.idp.id).first<Provider>();
    }
  }

  const identity = await env.DB.prepare(`
    SELECT * FROM Identities, Providers, Users
    WHERE CFProviderID = ?
      AND Users.ID = UserID
      AND Providers.ID = ?
      AND ProviderIdentityID = ?
  `).bind(jwtIdentity.idp.id, provider.ID, jwtIdentity.user_uuid).first<Identity>();

  return { identity, jwtIdentity, provider };
}
