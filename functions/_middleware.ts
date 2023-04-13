import type { Env } from '../lib/Identity';

const onRequestCors: PagesFunction<Env> = async ({ env, next }) => {
  if (env.ENVIRONMENT !== 'development') {
    // CORS headers are only required in dev where the origins differ (for now)
    return next();
  }
  const response = await next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
};

export const onRequest = [onRequestCors];
