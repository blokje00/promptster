import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  invokeLLM,
  parseJsonResponse,
  assertMatchesSchema,
  LLMError,
  DEFAULT_BASE_URL,
  DEFAULT_TEXT_MODEL,
  DEFAULT_VISION_MODEL,
} from '../../../base44/functions/utils/nousLLM/entry.ts';

/**
 * Tests voor de gedeelde Nous Research LLM-module die de backend functions
 * gebruiken. fetch en Deno.env worden gemockt; er gaat niets naar buiten.
 */

const env = {};

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

describe('nousLLM parseJsonResponse', () => {
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

  it('throws LLMError on non-JSON', () => {
    expect(() => parseJsonResponse('no json here')).toThrow(LLMError);
  });
});

describe('nousLLM assertMatchesSchema', () => {
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

  it('throws LLMError naming a missing required key', () => {
    const schema = { type: 'object', required: ['title'], properties: {} };
    expect(() => assertMatchesSchema({}, schema)).toThrow(/missing title/);
  });

  it('throws LLMError when an array-typed property is not an array', () => {
    const schema = { type: 'object', properties: { items: { type: 'array' } } };
    expect(() => assertMatchesSchema({ items: 'oops' }, schema)).toThrow(LLMError);
  });

  it('throws LLMError when an object-typed property is missing', () => {
    const schema = { type: 'object', properties: { meta: { type: 'object' } } };
    expect(() => assertMatchesSchema({}, schema)).toThrow(LLMError);
  });
});

describe('nousLLM invokeLLM', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    for (const key of Object.keys(env)) delete env[key];
    env.nousresearch = 'test-key';
    globalThis.Deno = { env: { get: (key) => env[key] } };
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    delete globalThis.Deno;
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('throws when the nousresearch secret is missing and never calls the API', async () => {
    delete env.nousresearch;
    await expect(invokeLLM({ prompt: 'hi' })).rejects.toThrow(/nousresearch/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('accepts NOUS_API_KEY as an alias for the nousresearch secret', async () => {
    delete env.nousresearch;
    env.NOUS_API_KEY = 'alias-key';
    globalThis.fetch.mockResolvedValueOnce(okResponse('hi'));
    await invokeLLM({ prompt: 'p' });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer alias-key');
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
      .rejects.toMatchObject({ name: 'LLMError', status: 502, message: expect.stringMatching(/items/) });
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

  it('surfaces API errors as LLMError with the upstream status', async () => {
    globalThis.fetch.mockResolvedValueOnce(errorResponse(401, 'invalid key'));

    await expect(invokeLLM({ prompt: 'p' })).rejects.toMatchObject({ name: 'LLMError', status: 401 });
  });

  it('throws a 504 LLMError when the request times out', async () => {
    vi.useFakeTimers();
    env.NOUS_TIMEOUT_MS = '50';
    globalThis.fetch.mockImplementationOnce(() => new Promise(() => {})); // never resolves

    const pending = expect(invokeLLM({ prompt: 'p' }))
      .rejects.toMatchObject({ name: 'LLMError', status: 504, message: /timeout after 50ms/ });

    await vi.advanceTimersByTimeAsync(50);
    await pending;

    vi.useRealTimers();
  });

  it('treats an AbortError from fetch itself as a timeout', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    globalThis.fetch.mockRejectedValueOnce(abortError);

    await expect(invokeLLM({ prompt: 'p' })).rejects.toMatchObject({ name: 'LLMError', status: 504 });
  });

  it('throws a 422 LLMError when the model refuses with an explicit refusal', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      okResponse(null, { message: { refusal: 'unsafe content' } }),
    );

    await expect(invokeLLM({ prompt: 'p' }))
      .rejects.toMatchObject({ name: 'LLMError', status: 422, message: /unsafe content/ });
  });

  it('treats finish_reason "content_filter" as a refusal', async () => {
    globalThis.fetch.mockResolvedValueOnce(okResponse('', { finish_reason: 'content_filter' }));

    await expect(invokeLLM({ prompt: 'p' })).rejects.toMatchObject({ name: 'LLMError', status: 422 });
  });

  it('honours model overrides from env and per call', async () => {
    env.NOUS_TEXT_MODEL = 'custom/text';
    globalThis.fetch.mockResolvedValueOnce(okResponse('x')).mockResolvedValueOnce(okResponse('y'));

    await invokeLLM({ prompt: 'p' });
    expect(lastRequestBody().model).toBe('custom/text');

    await invokeLLM({ prompt: 'p', model: 'per/call' });
    expect(lastRequestBody().model).toBe('per/call');
  });
});
