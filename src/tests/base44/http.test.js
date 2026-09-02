// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests voor de gedeelde backend-basis (base44/functions/utils/http):
 * withAuth (auth, body, fouten, CORS) en de ok()/fail()-antwoordvorm.
 * De Base44 SDK wordt gemockt; er gaat niets naar buiten.
 */

const state = vi.hoisted(() => ({ user: null, meError: null }));

vi.mock('@base44/sdk', () => ({
  createClientFromRequest: () => ({
    auth: {
      me: async () => {
        if (state.meError) throw state.meError;
        return state.user;
      },
    },
  }),
}));

import { withAuth, ok, fail } from '../../../base44/functions/utils/http/entry.ts';

function jsonRequest(body, { method = 'POST', headers = {} } = {}) {
  return new Request('https://fn.test/x', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('http ok/fail', () => {
  it('ok() wraps the payload with ok: true and status 200', async () => {
    const res = ok({ result: 'x', success: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, result: 'x', success: true });
  });

  it('fail() returns ok: false, the error and extra fields with the given status', async () => {
    const res = fail('nope', 418, { requires_upgrade: true });
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ ok: false, error: 'nope', requires_upgrade: true });
  });
});

describe('http withAuth', () => {
  beforeEach(() => {
    state.user = { id: 'u1', email: 'u1@example.com', role: 'user' };
    state.meError = null;
  });

  it('returns 401 when there is no user and never calls the handler', async () => {
    state.user = null;
    const handler = vi.fn();
    const res = await withAuth({ name: 't' }, handler)(jsonRequest({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: 'Unauthorized' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 403 for admin-only functions when the user is not admin', async () => {
    const res = await withAuth({ name: 't', admin: true }, vi.fn())(jsonRequest({}));
    expect(res.status).toBe(403);
    expect((await res.json()).ok).toBe(false);
  });

  it('parses a JSON body and passes user, base44 and body to the handler', async () => {
    let seen;
    const res = await withAuth({ name: 't' }, async (ctx) => {
      seen = ctx;
      return ok({ got: ctx.body.prompt });
    })(jsonRequest({ prompt: 'hi' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, got: 'hi' });
    expect(seen.user.email).toBe('u1@example.com');
    expect(seen.base44.auth).toBeDefined();
  });

  it('leaves non-JSON bodies unread so the handler can consume them', async () => {
    const req = new Request('https://fn.test/x', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'raw upload bytes',
    });
    const res = await withAuth({ name: 't' }, async ({ req: inner, body }) => {
      expect(body).toEqual({});
      return ok({ text: await inner.text() });
    })(req);
    expect(await res.json()).toEqual({ ok: true, text: 'raw upload bytes' });
  });

  it('turns invalid JSON into an empty body instead of crashing', async () => {
    const req = new Request('https://fn.test/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    const res = await withAuth({ name: 't' }, async ({ body }) => ok({ body }))(req);
    expect(await res.json()).toEqual({ ok: true, body: {} });
  });

  it('forwards a numeric error.status from the handler, without a stack', async () => {
    const err = Object.assign(new Error('rate limited'), { status: 429 });
    const res = await withAuth({ name: 't' }, async () => { throw err; })(jsonRequest({}));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: 'rate limited' });
    expect(json.stack).toBeUndefined();
  });

  it('maps unexpected errors to 500', async () => {
    const res = await withAuth({ name: 't' }, async () => { throw new Error('boom'); })(jsonRequest({}));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: 'boom' });
  });

  it('maps auth.me() failures to 500 as well', async () => {
    state.meError = new Error('auth down');
    const res = await withAuth({ name: 't' }, vi.fn())(jsonRequest({}));
    expect(res.status).toBe(500);
  });

  it('answers CORS preflights and adds CORS headers when cors is enabled', async () => {
    const wrapped = withAuth({ name: 't', cors: true }, async () => ok({ a: 1 }));
    const preflight = await wrapped(new Request('https://fn.test/x', { method: 'OPTIONS' }));
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('*');

    const res = await wrapped(jsonRequest({}));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await res.json()).toEqual({ ok: true, a: 1 });
  });

  it('does not add CORS headers by default', async () => {
    const res = await withAuth({ name: 't' }, async () => ok())(jsonRequest({}));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
