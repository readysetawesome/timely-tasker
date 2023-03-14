import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest: PagesFunction<unknown, any, PluginData> = async ({
  data,
}) => {
  const identity = typeof data.cloudflareAccess !== "undefined" ?
    await data.cloudflareAccess.JWT.getIdentity() :
    {name: "dev user"}

  return new Response(JSON.stringify(identity));
};
