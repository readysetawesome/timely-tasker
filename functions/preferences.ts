import type { Env } from '../lib/Identity';
import { GetIdentity } from '../lib/Identity';

export type UserPreferences = {
  dailyGoalHours?: number;
  worksWeekends?: boolean;
};

const JsonHeader = {
  headers: { 'content-type': 'application/json;charset=UTF-8' },
};

const errorResponse = (error: string) =>
  new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<Env, never> = async ({
  env,
  request,
}) => {
  const { identity, error } = await GetIdentity(request, env);

  if (error) return errorResponse(error);
  if (identity === null) return errorResponse('Unexpected Null Identity');

  if (request.method === 'POST') {
    const incoming = await request.json<Partial<UserPreferences>>();

    const existing = await env.DB.prepare(
      `SELECT preferences FROM UserPreferences WHERE userId = ?`
    )
      .bind(identity.userId)
      .first<{ preferences: string }>();

    const merged = {
      ...(existing ? JSON.parse(existing.preferences) : {}),
      ...incoming,
    };

    await env.DB.prepare(
      `INSERT INTO UserPreferences (userId, preferences)
       VALUES (?, ?)
       ON CONFLICT(userId) DO UPDATE SET preferences = excluded.preferences`
    )
      .bind(identity.userId, JSON.stringify(merged))
      .run();

    return new Response(JSON.stringify(merged), JsonHeader);
  }

  // GET
  const row = await env.DB.prepare(
    `SELECT preferences FROM UserPreferences WHERE userId = ?`
  )
    .bind(identity.userId)
    .first<{ preferences: string }>();

  const prefs: UserPreferences = row ? JSON.parse(row.preferences) : {};
  return new Response(JSON.stringify(prefs), JsonHeader);
};
