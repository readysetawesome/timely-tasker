import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import type { Env } from "../lib/Identity"
import { GetIdentity } from "../lib/Identity"
import { PagesFunction } from "@cloudflare/workers-types";

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8'
  }
}

export type TimerTick = {
  ID: number,
  UserID: number,
  TickNumber: number,
  Distracted: number,
  SummaryID: number,
}

const errorResponse = (error: string) => new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<Env, any, PluginData> = async ({
  data, env, request, next
}) => {
  const result = await GetIdentity(data, env);
  const { identity, error } = result;

  if (error) return errorResponse(error);

  if (identity === null) {
    return errorResponse("Unexpected Null Identity");
  }

  const { searchParams } = new URL(request.url);
  const [summary, distracted, tick] = [
    searchParams.get('summary'),
    searchParams.get('distracted'),
    searchParams.get('tick'),
  ]

  if (request.method === 'POST') {
    // BEGIN CREATE/UPDATE REQUEST
    const { results, success, error } = await env.DB.prepare(`
      SELECT * FROM TimerTicks
      WHERE SummaryID = ? AND TickNumber = ?
    `).bind(summary, tick).all<TimerTick>();

    if (!success) return errorResponse(`Error getting tick row. ${error}`);
    let timerTick = results[0];
    if (timerTick) {
      const { success, error } = await env.DB.prepare(`
        UPDATE TimerTicks
        SET Distracted = (CASE WHEN Distracted = 0 THEN 1 WHEN Distracted = 1 THEN -1 ELSE 0 END)
        WHERE ID = ?
      `).bind(timerTick.ID).run();

      if (!success) return errorResponse(`Error updating summary/task row. ${error}`);
    } else {
      const { success } = await env.DB.prepare(`
        INSERT INTO TimerTicks (UserID, TickNumber, Distracted, SummaryID) values (?, ?, ?, ?)
      `).bind(identity.UserID, tick, 0, summary).run();

      if (!success) return errorResponse("Error inserting new summary/task row.");

      timerTick = await env.DB.prepare(`
        SELECT * FROM TimerTicks WHERE ID=last_insert_rowid();
      `).first<TimerTick>();
    }

    return new Response(JSON.stringify(timerTick, null, 2), JsonHeader);
    // END CREATE/UPDATE REQUEST
  } else {
    // not implemented
    next();
  }
};
