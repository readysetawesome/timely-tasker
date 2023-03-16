import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import type { Env } from "../lib/Identity"
import { GetIdentity } from "../lib/Identity"
import { PagesFunction, Request } from "@cloudflare/workers-types";

const JsonHeader = {
  headers: {
    'content-type': 'application/json;charset=UTF-8'
  }
}

const errorResponse = (error: string) => new Response(JSON.stringify({ error }), JsonHeader);

type CreateSummary = {
  date: Date,
  text: string,
}

export const onRequest: PagesFunction<Env, any, PluginData> = async ({
  data, env, request
}) => {
  const result = await GetIdentity(data, env);
  const { identity, error } = result;

  if (error) return errorResponse(error);

  if (identity === null) {
    return errorResponse("Unexpected Null Identity");
  }

  const params: CreateSummary = await request.json();

  return new Response(JSON.stringify(identity, null, 2), JsonHeader);
};
