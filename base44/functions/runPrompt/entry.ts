import { withAuth, ok, fail } from '../utils/http/entry.ts';
import { invokeLLM } from '../utils/nousLLM/entry.ts';

/**
 * Run a prompt through the Nous Research LLM (see utils/nousLLM).
 * Open to every logged-in user: single-user app, no subscriptions.
 */

Deno.serve(withAuth({ name: 'runPrompt', cors: true }, async ({ body }) => {
  const { prompt, file_urls } = body || {};
  if (!prompt) {
    return fail('Missing prompt', 400);
  }

  console.log(`[runPrompt] prompt length: ${prompt.length}, files: ${file_urls?.length || 0}`);

  const result = await invokeLLM({ prompt, file_urls: file_urls || undefined });

  console.log(`[runPrompt] success, result length: ${result?.length || 0}`);

  return ok({ result, credits_used: 1 });
}));
