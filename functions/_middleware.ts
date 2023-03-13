import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest: PagesFunction = cloudflareAccessPlugin({
  domain: "https://timely-tasker.cloudflareaccess.com",
  aud: "d2ed32aa3e70054195dc74af294e9ea7b8d76f36a6041bdb6ef3ca7d8c39841b",
});
