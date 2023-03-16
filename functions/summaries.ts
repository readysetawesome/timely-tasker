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

export type Summary = {
  ID: number,
  UserID: number,
  Content: Text,
  Date: Date,
  Slot: number,
  TimerTicks: Array<TimerTick>,
}

const errorResponse = (error: string) => new Response(JSON.stringify({ error }), JsonHeader);

export const onRequest: PagesFunction<Env, any, PluginData> = async ({
  data, env, request
}) => {
  const result = await GetIdentity(data, env);
  const { identity, error } = result;

  if (error) return errorResponse(error);

  if (identity === null) {
    return errorResponse("Unexpected Null Identity");
  }

  const { searchParams } = new URL(request.url);

  if (request.method === 'POST') {
    // BEGIN CREATE REQUEST
    const { success } = await env.DB.prepare(`
      INSERT INTO Summaries (UserID, Content, Date, Slot) values (?, ?, ?, ?)
    `).bind(
      identity.UserID,
      searchParams.get('text'),
      searchParams.get('date'),
      searchParams.get('slot'),
    ).run();

    if (!success) return errorResponse("Error inserting new summary/task row.");

    const summary = await env.DB.prepare(`
      SELECT * FROM Summaries WHERE ID=last_insert_rowid();
    `).first<Summary>();

    return new Response(JSON.stringify(summary, null, 2), JsonHeader);
    // END CREATE REQUEST
  } else {
    // BEGIN INDEX REQUEST
    const { results } = await env.DB.prepare(`
      SELECT Summaries.*, (
        SELECT json_group_array(
          json_object(
            'ID', ID,
            'UserID', UserID,
            'Date', Date,
            'TickNumber', TickNumber,
            'Distracted', Distracted,
            'SummaryID', SummaryID
          )
        )
        FROM TimerTicks TT
        WHERE TT.SummaryID = Summaries.ID
      ) as TimerTicks
      FROM Summaries
      WHERE UserID=? AND Date = ? ORDER BY Slot;
    `).bind(identity.UserID, searchParams.get('date')).all<Summary>();

    // Slight hack to unpack json values returned by the sqlite api
    results.forEach((value, index, array) => {
      value.TimerTicks = JSON.parse(value.TimerTicks as unknown as string);
    })

    return new Response(JSON.stringify(results, null, 2), JsonHeader);
    // END INDEX REQUEST
  }
};
