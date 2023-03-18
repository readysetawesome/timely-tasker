import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import type { Env } from "../lib/Identity"
import { GetIdentity } from "../lib/Identity"
import { PagesFunction } from "@cloudflare/workers-types";
import { TimerTick } from "../src/components/Timer/TaskRow";

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8'
  }
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
    parseInt(searchParams.get('summary')),
    parseInt(searchParams.get('distracted')),
    parseInt(searchParams.get('tick')),
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
      if (distracted !== 0 && distracted !== 1) {
        // there should be no tick, delete it
        const { success, error } = await env.DB.prepare(`
          DELETE FROM TimerTicks WHERE ID = ?
        `).bind(timerTick.ID).run();
        if (!success) return errorResponse(`Error deleting tick. ${error}`);
      } else {
        const { success, results } = await env.DB.prepare(`
          UPDATE TimerTicks
          SET Distracted = ?
          WHERE ID = ? RETURNING *
        `).bind(distracted, timerTick.ID).all<TimerTick>();

        if (!success) return errorResponse(`Error updating tick. ${error}`);
        timerTick = results[0];
      }
    } else {
      const { success, results } = await env.DB.prepare(`
        INSERT INTO TimerTicks (UserID, TickNumber, Distracted, SummaryID) values (?, ?, ?, ?) RETURNING *
      `).bind(identity.UserID, tick, distracted, summary).all<TimerTick>();

      if (!success) return errorResponse("Error inserting new tick.");

      timerTick = results[0];
    }

    return new Response(JSON.stringify(timerTick, null, 2), JsonHeader);
    // END CREATE/UPDATE REQUEST
  } else {
    // not implemented
    next();
  }
};
