import { TASKER_COOKIE } from '../lib/Identity';

export const onRequestPost: PagesFunction = async () => {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'Set-Cookie': `${TASKER_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`,
    },
  });
};
