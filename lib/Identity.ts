import type { PluginData } from '@cloudflare/pages-plugin-cloudflare-access';
import devUserJson from '../fixtures/devUser.json';

export interface Env {
  DB: D1Database;
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

export type IdentityResponse = {
  error?: string;
  identity?: AppIdentity;
  jwtIdentity: {
    user_uuid: string;
    name: string;
    idp: { id: string; type: string };
    email: string;
  };
  provider?: Provider;
};

export const GetIdentity = async (
  data: PluginData,
  env: Env
): Promise<IdentityResponse> => {
  const pluginEnabled = typeof data.cloudflareAccess !== 'undefined';
  const jwtIdentity =
    (pluginEnabled && (await data.cloudflareAccess.JWT.getIdentity())) ||
    devUserJson;

  const providerQuery = env.DB.prepare(`
    SELECT * FROM Providers WHERE cfProviderId = ?
  `);

  let provider = await providerQuery.bind(jwtIdentity.idp.id).first<Provider>();

  if (provider === null) {
    // provider does not exist, lazy initialize

    const { success, results } = await env.DB.prepare(
      `
      INSERT INTO Providers (providerName, cfProviderId) values (?, ?) RETURNING *
    `
    )
      .bind(jwtIdentity.idp.type, jwtIdentity.idp.id)
      .all<Provider>();

    if (!success) {
      return { jwtIdentity, error: 'unable to insert new IDP' };
    } else {
      provider = results[0];
    }
  }

  const identity = await env.DB.prepare(
    `
    SELECT * FROM Identities, Providers, Users
    WHERE cfProviderId = ?
      AND Users.id = userId
      AND Providers.id = ?
      AND providerIdentityId = ?
  `
  )
    .bind(jwtIdentity.idp.id, provider.id, jwtIdentity.user_uuid)
    .first<AppIdentity>();

  return { identity, jwtIdentity, provider };
};
