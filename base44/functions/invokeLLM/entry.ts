import { withAuth, ok, fail } from '../utils/http/entry.ts';
import { invokeLLM } from '../utils/nousLLM/entry.ts';

/**
 * Generic LLM endpoint for the frontend.
 *
 * Replaces direct base44.integrations.Core.InvokeLLM calls from the browser
 * so the Nous API key stays server-side. The model is chosen on the server
 * (text vs. vision) and cannot be overridden by the client.
 *
 * Open to every logged-in user: no PRO gate, no rate limit (decision from
 * the owner — see REFACTOR_PLAN.md fase 0 punt 3).
 *
 * Body:    { prompt, file_urls?, response_json_schema?, system? }
 * Returns: { result } — a string, or the parsed object when a schema was given
 */

const MAX_PROMPT_CHARS = 200_000;

Deno.serve(withAuth({ name: 'invokeLLM' }, async ({ body }) => {
  const { prompt, file_urls, response_json_schema, system } = body || {};

  if (!prompt || typeof prompt !== 'string') {
    return fail('Missing prompt', 400);
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return fail('Prompt too long', 413);
  }

  const result = await invokeLLM({ prompt, file_urls, response_json_schema, system });

  return ok({ result });
}));
