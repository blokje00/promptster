/**
 * Shared HTTP plumbing for Deno backend functions.
 *
 * Every function used to repeat the same block: create the SDK client,
 * call auth.me(), return 401, parse the body, catch errors. `withAuth`
 * does that once; `ok`/`fail` give every function the same envelope:
 *
 *   success → { ok: true, ...payload }      (existing payload keys are kept)
 *   error   → { ok: false, error: string }  (never a stack trace)
 *
 * Errors thrown inside a handler may carry a numeric `status` (e.g. LLMError
 * from utils/nousLLM); it is forwarded instead of a blanket 500.
 *
 * @module http
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

export interface HandlerContext {
  req: Request;
  /** Base44 SDK client bound to the caller's session. */
  base44: any;
  /** Authenticated user (never null inside a handler). */
  user: any;
  /** Parsed JSON body; `{}` for GET, non-JSON content types or invalid JSON. */
  body: any;
}

export type Handler = (ctx: HandlerContext) => Promise<Response> | Response;

export interface WithAuthOptions {
  /** Short name used as log prefix, e.g. 'runPrompt'. */
  name: string;
  /** Require `user.role === 'admin'` (403 otherwise). */
  admin?: boolean;
  /** Add permissive CORS headers and answer OPTIONS preflights. */
  cors?: boolean;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Success response: `{ ok: true, ...payload }`. */
export function ok(payload: Record<string, unknown> = {}, init: ResponseInit = {}): Response {
  return Response.json({ ok: true, ...payload }, init);
}

/** Error response: `{ ok: false, error, ...extra }` with the given status. */
export function fail(
  error: string,
  status = 400,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ ok: false, error, ...extra }, { status });
}

function withCors(res: Response, cors: boolean): Response {
  if (!cors) return res;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function readBody(req: Request): Promise<any> {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  // Only JSON bodies are parsed here. Anything else (multipart uploads,
  // plain text) is left untouched so the handler can read it itself, e.g.
  // via `req.formData()` — a request body can only be consumed once.
  const contentType = (req.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) return {};
  try {
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/**
 * Wrap a handler with authentication, body parsing and uniform error handling.
 *
 * @example
 * Deno.serve(withAuth({ name: 'decomposeTask' }, async ({ base44, user, body }) => {
 *   if (!body.task_content) return fail('task_content is required');
 *   return ok({ success: true, variants });
 * }));
 */
export function withAuth(options: WithAuthOptions, handler: Handler) {
  const { name, admin = false, cors = false } = options;

  return async (req: Request): Promise<Response> => {
    if (cors && req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();

      if (!user) return withCors(fail('Unauthorized', 401), cors);
      if (admin && user.role !== 'admin') {
        return withCors(fail('Forbidden: admin access required', 403), cors);
      }

      const body = await readBody(req);
      const res = await handler({ req, base44, user, body });
      return withCors(res, cors);
    } catch (error) {
      const status = typeof error?.status === 'number' && error.status >= 400 && error.status <= 599
        ? error.status
        : 500;
      console.error(`[${name}] ${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`);
      return withCors(fail(error?.message || 'Internal server error', status), cors);
    }
  };
}
