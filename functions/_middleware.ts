import cloudflareAccessPlugin from "@cloudflare/pages-plugin-cloudflare-access";

interface Env {
  AUDIENCE: string;
}

export const onRequest: PagesFunction<Env> = (context) => {
  const aud = context.env.AUDIENCE;
  if (typeof aud !== 'string') {
    // must be local dev mode, just pass through
    // TODO: Stub local dev user auth in the middeware/functions
    return context.next();
  } else {
    return cloudflareAccessPlugin({
      domain: "https://timely-tasker.cloudflareaccess.com",
      aud: aud
    })(context);
  }
}

