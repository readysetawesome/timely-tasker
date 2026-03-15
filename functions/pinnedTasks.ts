import type { Env } from '../lib/Identity';
import { GetIdentity } from '../lib/Identity';

export type PinnedTask = {
  id: number;
  text: string;
  position: number;
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

  const { searchParams } = new URL(request.url);

  if (request.method === 'DELETE') {
    const id = searchParams.get('id');
    if (!id) return errorResponse('id is required');

    await env.DB.batch([
      env.DB.prepare(`DELETE FROM PinnedTasks WHERE id = ? AND userId = ?`)
        .bind(id, identity.userId),
      env.DB.prepare(`UPDATE PinnedTasks SET position = (
          SELECT COUNT(*) FROM PinnedTasks p2
          WHERE p2.userId = PinnedTasks.userId AND (
            p2.position < PinnedTasks.position OR
            (p2.position = PinnedTasks.position AND p2.id < PinnedTasks.id)
          )
        ) WHERE userId = ?`)
        .bind(identity.userId),
    ]);

    return new Response(JSON.stringify({ success: true }), JsonHeader);
  }

  if (request.method === 'PUT') {
    const { id, text } = await request.json<{ id: number; text: string }>();
    if (!id || !text) return errorResponse('id and text are required');

    const result = await env.DB.prepare(
      `UPDATE PinnedTasks SET text = ? WHERE id = ? AND userId = ? RETURNING id, text, position`
    )
      .bind(text, id, identity.userId)
      .first<PinnedTask>();

    if (!result) return errorResponse('Pin not found');
    return new Response(JSON.stringify(result), JsonHeader);
  }

  if (request.method === 'PATCH') {
    const { orderedIds } = await request.json<{ orderedIds: number[] }>();
    if (!Array.isArray(orderedIds)) return errorResponse('orderedIds array is required');

    const stmts = orderedIds.map((id, position) =>
      env.DB.prepare('UPDATE PinnedTasks SET position = ? WHERE id = ? AND userId = ?')
        .bind(position, id, identity.userId)
    );
    await env.DB.batch(stmts);

    const { results } = await env.DB.prepare(
      `SELECT id, text, position FROM PinnedTasks WHERE userId = ? ORDER BY position, id`
    )
      .bind(identity.userId)
      .all<PinnedTask>();

    return new Response(JSON.stringify(results ?? []), JsonHeader);
  }

  if (request.method === 'POST') {
    const { text, position } = await request.json<{ text: string; position?: number }>();
    if (!text) return errorResponse('text is required');

    const result = await env.DB.prepare(
      `INSERT INTO PinnedTasks (userId, text, position)
       VALUES (?, ?, COALESCE(?, (SELECT COUNT(*) FROM PinnedTasks WHERE userId = ?)))
       RETURNING id, text, position`
    )
      .bind(identity.userId, text, position ?? null, identity.userId)
      .first<PinnedTask>();

    if (!result) return errorResponse('Error creating pinned task');
    return new Response(JSON.stringify(result), JsonHeader);
  }

  // GET
  const { results } = await env.DB.prepare(
    `SELECT id, text, position FROM PinnedTasks WHERE userId = ? ORDER BY position, id`
  )
    .bind(identity.userId)
    .all<PinnedTask>();

  return new Response(JSON.stringify(results ?? []), JsonHeader);
};
