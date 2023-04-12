import type { Env } from '../lib/Identity';
import { GetIdentity } from '../lib/Identity';
import { TimerTick } from '../src/components/Timer/TaskRowTicks';

const FULL_JSON_OBJECT_SELECT = `
  Summaries.id, Summaries.content, Summaries.date, Summaries.slot, (
    SELECT json_group_array(
      json_object(
        'id', id,
        'userId', userId,
        'date', date,
        'tickNumber', tickNumber,
        'distracted', distracted,
        'summaryId', summaryId
      )
    )
    FROM TimerTicks TT
    WHERE TT.summaryId = Summaries.id
  ) as TimerTicks
`;

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
  },
};

export type Summary = {
  id?: number;
  userId?: number;
  content: string;
  date: number;
  slot: number;
  TimerTicks: Array<TimerTick>;
};

const errorResponse = (error: string) =>
  new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<Env, never> = async ({
  env,
  request,
}) => {
  const result = await GetIdentity(request, env);
  const { identity, error } = result;

  if (error) return errorResponse(error);

  if (identity === null) {
    return errorResponse('Unexpected Null Identity');
  }

  const { searchParams } = new URL(request.url);
  const [text, date, slot] = [
    searchParams.get('text'),
    searchParams.get('date'),
    searchParams.get('slot'),
  ];

  if (date?.length === 0) return errorResponse('Date is required');

  if (request.method === 'POST') {
    // BEGIN CREATE/UPDATE REQUEST
    if (slot?.length === 0) return errorResponse('Slot is required');

    let summary: Summary | undefined;

    const { results, success, error } = await env.DB.prepare(
      `
      SELECT * FROM Summaries
      WHERE userId = ? AND date = ? AND slot = ?
    `
    )
      .bind(identity?.userId, date, slot)
      .all<Summary>();

    if (!success)
      return errorResponse(`Error getting summary/task row. ${error}`);
    summary = results?.[0];

    if (summary) {
      const {
        results: _results,
        success,
        error,
      } = await env.DB.prepare(
        `
        UPDATE Summaries
        SET content = ?, slot = ?
        WHERE id = ?
        RETURNING ${FULL_JSON_OBJECT_SELECT}
      `
      )
        .bind(text, slot, results?.[0].id)
        .all<Summary>();

      if (!success)
        return errorResponse(`Error updating summary/task row. ${error}`);
      summary = _results?.[0];
    } else {
      const { success, results: _results } = await env.DB.prepare(
        `
        INSERT INTO Summaries (userId, content, date, slot) values (?, ?, ?, ?) RETURNING ${FULL_JSON_OBJECT_SELECT}
      `
      )
        .bind(identity?.userId, text, date, slot)
        .all<Summary>();

      if (!success)
        return errorResponse('Error inserting new summary/task row.');
      summary = _results?.[0];
    }
    if (summary === undefined)
      return errorResponse('Error inserting new summary/task row.');

    // Slight hack to unpack json values returned by the sqlite api
    summary.TimerTicks = JSON.parse(summary.TimerTicks as unknown as string);

    return new Response(JSON.stringify(summary, null, 2), JsonHeader);
    // END CREATE/UPDATE REQUEST
  } else {
    // BEGIN INDEX REQUEST
    const { results } = await env.DB.prepare(
      `
      SELECT ${FULL_JSON_OBJECT_SELECT}
      FROM Summaries
      WHERE userId=? AND date = ? ORDER BY slot;
    `
    )
      .bind(identity?.userId, searchParams.get('date'))
      .all<Summary>();

    // Slight hack to unpack json values returned by the sqlite api
    results?.forEach((value) => {
      value.TimerTicks = JSON.parse(value.TimerTicks as unknown as string);
    });

    return new Response(JSON.stringify(results, null, 2), JsonHeader);
    // END INDEX REQUEST
  }
};
