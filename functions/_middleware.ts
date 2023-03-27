import cloudflareAccessPlugin from '@cloudflare/pages-plugin-cloudflare-access';

interface Env {
  AUDIENCE: string;
}

// Respond to OPTIONS method
// TODO only enable this for dev until needed otherwise
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  });
};

// Set CORS to all /api responses
// TODO only enable this for dev until needed otherwise
const onRequestCors: PagesFunction = async ({ next }) => {
  const response = await next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
};

const onRequestDoPlugin: PagesFunction<Env> = (context) => {
  const aud = context.env.AUDIENCE;
  if (typeof aud !== 'string') {
    // must be local dev mode, just pass through
    // TODO: Stub local dev user auth in the middeware/functions
    return context.next();
  } else {
    return cloudflareAccessPlugin({
      domain: 'https://timely-tasker.cloudflareaccess.com',
      aud: aud,
    })(context);
  }
};

export const onRequest = [onRequestCors, onRequestDoPlugin];
