import type { Env } from '../lib/Identity';
import { GetIdentity } from '../lib/Identity';
import { TimerTick } from '../src/components/Timer/TaskRowTicks';

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
  },
};

const errorResponse = (error: string) =>
  new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<Env> = async ({ env, request, next }) => {
  const result = await GetIdentity(request, env);
  const { identity, error } = result;

  if (error) return errorResponse(error);

  if (identity === null || identity === undefined) {
    return errorResponse('Unexpected Null Identity');
  }

  const { searchParams } = new URL(request.url);
  const [summary, distracted, tick] = [
    searchParams.get('summary'),
    parseInt(searchParams.get('distracted') || '-1'),
    parseInt(searchParams.get('tick') || '-1'),
  ];

  if (tick < 0) {
    return errorResponse('Parameter error, positive integers required "tick".');
  }

  if (request.method === 'POST') {
    // BEGIN CREATE/UPDATE REQUEST
    const { results, success, error } = await env.DB.prepare(
      `
      SELECT * FROM TimerTicks
      WHERE summaryId = ? AND tickNumber = ?
    `
    )
      .bind(summary, tick)
      .all<TimerTick>();

    if (!success) return errorResponse(`Error getting tick row. ${error}`);
    let timerTick: TimerTick | undefined = results?.[0];
    if (timerTick) {
      if (distracted !== 0 && distracted !== 1) {
        // there should be no tick, delete it
        const { success, error } = await env.DB.prepare(
          `
          DELETE FROM TimerTicks WHERE id = ?
        `
        )
          .bind(timerTick.id)
          .run();
        if (!success) return errorResponse(`Error deleting tick. ${error}`);
      } else {
        const { success, results } = await env.DB.prepare(
          `
          UPDATE TimerTicks
          SET distracted = ?
          WHERE id = ? RETURNING *
        `
        )
          .bind(distracted, timerTick.id)
          .all<TimerTick>();

        if (!success) return errorResponse(`Error updating tick. ${error}`);
        timerTick = results?.[0];
      }
    } else {
      const { success, results } = await env.DB.prepare(
        `
        INSERT INTO TimerTicks (userId, tickNumber, distracted, summaryId) values (?, ?, ?, ?) RETURNING *
      `
      )
        .bind(identity.userId, tick, distracted, summary)
        .all<TimerTick>();

      if (!success) return errorResponse('Error inserting new tick.');

      timerTick = results?.[0];
    }

    return new Response(JSON.stringify(timerTick, null, 2), JsonHeader);
    // END CREATE/UPDATE REQUEST
  } else {
    // not implemented
    return next();
  }
};
