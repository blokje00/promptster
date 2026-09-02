import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  invokeLLM,
  parseJsonResponse,
  assertMatchesSchema,
  configureNous,
  resetNous,
  isNousConfigured,
  NousError,
  NOT_CONFIGURED_MESSAGE,
  DEFAULT_BASE_URL,
  DEFAULT_TEXT_MODEL,
  DEFAULT_VISION_MODEL,
} from '@/lib/nousClient';

/**
 * Tests for the browser-side Nous Research LLM client (src/lib/nousClient.js).
 * This is the client-side port of src/tests/base44/nousLLM.test.js — that
 * file covers the Deno backend module (base44/functions/utils/nousLLM),
 * which is a spiegel of the platform and no longer reachable from the
 * frontend on this Base44 plan (no backend functions). This file exercises
 * the same behaviour through configureNous()/resetNous() instead of a
 * mocked Deno.env, since the key now lives in module state loaded from the
 * signed-in user's AISettings row (see src/components/ai/NousKeyLoader.jsx).
 * fetch is mocked; nothing goes out over the network.
 */

function okResponse(content, extra = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content, ...extra.message }, finish_reason: extra.finish_reason }] }),
    text: async () => '',
  };
}

function errorResponse(status, text = 'bad request') {
  return { ok: false, status, json: async () => ({}), text: async () => text };
}

function lastRequestBody() {
  const [, init] = globalThis.fetch.mock.calls.at(-1);
  return JSON.parse(init.body);
}

describe('nousClient parseJsonResponse', () => {
  it('parses plain JSON', () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips markdown fences', () => {
    expect(parseJsonResponse('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('extracts JSON embedded in prose', () => {
    expect(parseJsonResponse('Here you go: {"ideas":[1,2]} hope it helps')).toEqual({ ideas: [1, 2] });
  });

  it('prefers the {...} slice when a stray [ sits in the preamble', () => {
    expect(parseJsonResponse('Here is the result [as requested]: {"a":1}')).toEqual({ a: 1 });
  });

  it('prefers the [...] slice when the schema declares a top-level array', () => {
    expect(parseJsonResponse('values (see note): [1,2,3]', { type: 'array' })).toEqual([1, 2, 3]);
  });

  it('throws NousError on non-JSON', () => {
    expect(() => parseJsonResponse('no json here')).toThrow(NousError);
  });
});

describe('nousClient assertMatchesSchema', () => {
  it('is a no-op when there is no schema', () => {
    expect(() => assertMatchesSchema({ anything: true }, undefined)).not.toThrow();
  });

  it('passes when required keys and typed properties are present', () => {
    const schema = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        items: { type: 'array' },
        meta: { type: 'object' },
      },
    };
    expect(() => assertMatchesSchema({ title: 'x', items: [], meta: {} }, schema)).not.toThrow();
  });

  it('throws NousError naming a missing required key', () => {
    const schema = { type: 'object', required: ['title'], properties: {} };
    expect(() => assertMatchesSchema({}, schema)).toThrow(/missing title/);
  });

  it('throws NousError when an array-typed property is not an array', () => {
    const schema = { type: 'object', properties: { items: { type: 'array' } } };
    expect(() => assertMatchesSchema({ items: 'oops' }, schema)).toThrow(NousError);
  });

  it('throws NousError when an object-typed property is missing', () => {
    const schema = { type: 'object', properties: { meta: { type: 'object' } } };
    expect(() => assertMatchesSchema({}, schema)).toThrow(NousError);
  });
});

describe('nousClient invokeLLM', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn();
    configureNous({ apiKey: 'test-key' });
  });

  afterEach(() => {
    resetNous();
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('throws NOT_CONFIGURED when no key has been configured and never calls the API', async () => {
    resetNous();
    expect(isNousConfigured()).toBe(false);

    await expect(invokeLLM({ prompt: 'hi' }))
      .rejects.toMatchObject({ name: 'NousError', status: 401, message: NOT_CONFIGURED_MESSAGE });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('reports configured once a key is set', () => {
    expect(isNousConfigured()).toBe(true);
  });

  it('sends text prompts to the text model and returns the string', async () => {
    globalThis.fetch.mockResolvedValueOnce(okResponse('hello back'));

    const result = await invokeLLM({ prompt: 'hi' });

    expect(result).toBe('hello back');
    const [url, init] = globalThis.fetch.mock.calls[0];
    expect(url).toBe(`${DEFAULT_BASE_URL}/chat/completions`);
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body);
    expect(body.model).toBe(DEFAULT_TEXT_MODEL);
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(body.response_format).toBeUndefined();
  });

  it('switches to the vision model and attaches images when file_urls are given', async () => {
    globalThis.fetch.mockResolvedValueOnce(okResponse('seen'));

    await invokeLLM({ prompt: 'describe', file_urls: ['https://x/a.png', ''] });

    const body = lastRequestBody();
    expect(body.model).toBe(DEFAULT_VISION_MODEL);
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'describe' },
      { type: 'image_url', image_url: { url: 'https://x/a.png' } },
    ]);
  });

  it('requests JSON and returns the parsed object when a schema is given', async () => {
    globalThis.fetch.mockResolvedValueOnce(okResponse('```json\n{"description":"ok"}\n```'));
    const schema = { type: 'object', properties: { description: { type: 'string' } } };

    const result = await invokeLLM({ prompt: 'p', response_json_schema: schema });

    expect(result).toEqual({ description: 'ok' });
    const body = lastRequestBody();
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain(JSON.stringify(schema));
    expect(body.messages[1]).toEqual({ role: 'user', content: 'p' });
  });

  it('rejects a parsed response that does not match the requested schema', async () => {
    globalThis.fetch.mockResolvedValueOnce(okResponse('{"description":"ok"}'));
    const schema = {
      type: 'object',
      properties: {
        description: { type: 'string' },
        items: { type: 'array' },
      },
    };

    await expect(invokeLLM({ prompt: 'p', response_json_schema: schema }))
      .rejects.toMatchObject({ name: 'NousError', status: 502, message: expect.stringMatching(/items/) });
  });

  it('retries once without response_format when the error mentions response_format', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(errorResponse(400, 'response_format not supported'))
      .mockResolvedValueOnce(okResponse('{"a":1}'));

    const result = await invokeLLM({ prompt: 'p', response_json_schema: { type: 'object' } });

    expect(result).toEqual({ a: 1 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(lastRequestBody().response_format).toBeUndefined();
  });

  it('does not retry a 400 unrelated to response_format/json', async () => {
    globalThis.fetch.mockResolvedValueOnce(errorResponse(400, 'invalid prompt content'));

    await expect(invokeLLM({ prompt: 'p', response_json_schema: { type: 'object' } }))
      .rejects.toMatchObject({ status: 400 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('never retries more than once even if the retry also fails', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(errorResponse(400, 'response_format not supported'))
      .mockResolvedValueOnce(errorResponse(400, 'response_format not supported'));

    await expect(invokeLLM({ prompt: 'p', response_json_schema: { type: 'object' } }))
      .rejects.toMatchObject({ status: 400 });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('surfaces a 401 as NousError with the Dutch key-rejected message', async () => {
    globalThis.fetch.mockResolvedValueOnce(errorResponse(401, 'invalid key'));

    await expect(invokeLLM({ prompt: 'p' })).rejects.toMatchObject({
      name: 'NousError',
      status: 401,
      message: expect.stringMatching(/weigert de sleutel \(401\)/),
    });
  });

  it('throws a 504 NousError when the request times out', async () => {
    vi.useFakeTimers();
    configureNous({ apiKey: 'test-key', timeoutMs: 50 });
    // nousClient aborts via AbortController + fetch's own signal, unlike the
    // Deno module's Promise.race — so the mock must honour the signal like a
    // real fetch() would, rejecting with an AbortError once it's aborted.
    globalThis.fetch.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const abortError = new Error('aborted');
        abortError.name = 'AbortError';
        reject(abortError);
      });
    }));

    const pending = expect(invokeLLM({ prompt: 'p' }))
      .rejects.toMatchObject({ name: 'NousError', status: 504, message: /timeout after 50ms/ });

    await vi.advanceTimersByTimeAsync(50);
    await pending;

    vi.useRealTimers();
  });

  it('treats an AbortError from fetch itself as a timeout', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    globalThis.fetch.mockRejectedValueOnce(abortError);

    await expect(invokeLLM({ prompt: 'p' })).rejects.toMatchObject({ name: 'NousError', status: 504 });
  });

  it('throws a 422 NousError when the model refuses with an explicit refusal', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      okResponse(null, { message: { refusal: 'unsafe content' } }),
    );

    await expect(invokeLLM({ prompt: 'p' }))
      .rejects.toMatchObject({ name: 'NousError', status: 422, message: /unsafe content/ });
  });

  it('treats finish_reason "content_filter" as a refusal', async () => {
    globalThis.fetch.mockResolvedValueOnce(okResponse('', { finish_reason: 'content_filter' }));

    await expect(invokeLLM({ prompt: 'p' })).rejects.toMatchObject({ name: 'NousError', status: 422 });
  });

  it('honours model overrides from config and per call', async () => {
    configureNous({ apiKey: 'test-key', textModel: 'custom/text' });
    globalThis.fetch.mockResolvedValueOnce(okResponse('x')).mockResolvedValueOnce(okResponse('y'));

    await invokeLLM({ prompt: 'p' });
    expect(lastRequestBody().model).toBe('custom/text');

    await invokeLLM({ prompt: 'p', model: 'per/call' });
    expect(lastRequestBody().model).toBe('per/call');
  });
});
