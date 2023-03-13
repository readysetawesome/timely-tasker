import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest = ({ env }) => {
  return cloudflareAccessPlugin({
    domain: "https://timely-tasker.cloudflareaccess.com",
    aud: env.AUDIENCE,
  });
}
