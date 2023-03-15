import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import { ServerResponse } from "http";

interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<unknown, any, PluginData> = async ({
  data, env
}) => {
  const pluginEnabled = typeof data.cloudflareAccess !== "undefined";
  const jwtIdentity = pluginEnabled ?
    await data.cloudflareAccess.JWT.getIdentity() :
    { id: 'xxxx-12345', name: "dev user", idp: { id: "6a2cf522-5232-46c9-9da2-528e6ece1842", type: "github" }, email: 'foo@zoo.dev.com' }

    return new Response(JSON.stringify(jwtIdentity, null, 2), {
			headers: {
				'content-type': 'application/json;charset=UTF-8'
			}
    });
};
