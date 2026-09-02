/**
 * Shared LLM client for backend functions.
 *
 * Routes every text and vision request to Nous Research's OpenAI-compatible
 * inference API, replacing base44.integrations.Core.InvokeLLM so the app
 * runs on its own Nous account instead of Base44 LLM credits.
 *
 * Configuration comes from platform secrets (Base44 dashboard → Secrets):
 *   nousresearch        required: the Nous API key (name of the Base44 secret;
 *                       NOUS_API_KEY is accepted as an alias)
 *   NOUS_API_BASE_URL   optional, default https://inference-api.nousresearch.com/v1
 *   NOUS_TEXT_MODEL     optional, default deepseek/deepseek-v4-flash-0731
 *   NOUS_VISION_MODEL   optional, default deepseek/deepseek-v4-flash-vision-exp
 *   NOUS_TIMEOUT_MS     optional, default 90000
 *
 * Return contract mirrors InvokeLLM: a string, or — when
 * `response_json_schema` is given — the parsed JSON object.
 *
 * @module nousLLM
 */

export const DEFAULT_BASE_URL = 'https://inference-api.nousresearch.com/v1';
export const DEFAULT_TEXT_MODEL = 'deepseek/deepseek-v4-flash-0731';
export const DEFAULT_VISION_MODEL = 'deepseek/deepseek-v4-flash-vision-exp';
export const DEFAULT_TIMEOUT_MS = 90_000;

export interface InvokeLLMParams {
  prompt: string;
  /** Image URLs. When present the vision model is used. */
  file_urls?: string[];
  /** JSON schema the answer must follow; the result is parsed and returned as an object. */
  response_json_schema?: Record<string, unknown>;
  /** Optional system instruction. */
  system?: string;
  /** Override the model for this call (server-side callers only). */
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMConfig {
  apiKey: string | undefined;
  baseUrl: string;
  textModel: string;
  visionModel: string;
}

export class LLMError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
  }
}

/** Secret names accepted for the Nous API key, in order of preference. */
export const API_KEY_ENV_NAMES = ['nousresearch', 'NOUSRESEARCH', 'NOUS_API_KEY'];

function readApiKey(): string | undefined {
  for (const name of API_KEY_ENV_NAMES) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return undefined;
}

export function getLLMConfig(): LLMConfig {
  return {
    apiKey: readApiKey(),
    baseUrl: (Deno.env.get('NOUS_API_BASE_URL') || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    textModel: Deno.env.get('NOUS_TEXT_MODEL') || DEFAULT_TEXT_MODEL,
    visionModel: Deno.env.get('NOUS_VISION_MODEL') || DEFAULT_VISION_MODEL,
  };
}

function getTimeoutMs(): number {
  const raw = Deno.env.get('NOUS_TIMEOUT_MS');
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/**
 * Send a prompt (optionally with images and/or a JSON schema) to the LLM.
 *
 * @returns string, or the parsed object when `response_json_schema` is set
 * @throws LLMError with an HTTP-ish status when config or the API call fails
 */
export async function invokeLLM(params: InvokeLLMParams): Promise<any> {
  const { prompt, file_urls, response_json_schema, system, model, temperature, max_tokens } = params;

  if (!prompt || typeof prompt !== 'string') {
    throw new LLMError('prompt is required', 400);
  }

  const cfg = getLLMConfig();
  if (!cfg.apiKey) {
    throw new LLMError('Nous API key is not configured on the server (set the secret "nousresearch")', 500);
  }

  const images = Array.isArray(file_urls)
    ? file_urls.filter((u) => typeof u === 'string' && u.length > 0)
    : [];
  const wantsJson = !!response_json_schema;
  const chosenModel = model || (images.length > 0 ? cfg.visionModel : cfg.textModel);

  const systemParts: string[] = [];
  if (system) systemParts.push(system);
  if (wantsJson) {
    systemParts.push(
      'Respond with a single JSON object only: no prose, no markdown fences. ' +
        'The object must match this JSON schema:\n' +
        JSON.stringify(response_json_schema),
    );
  }

  const userContent = images.length > 0
    ? [
        { type: 'text', text: prompt },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
      ]
    : prompt;

  const messages: Array<{ role: string; content: unknown }> = [];
  if (systemParts.length > 0) {
    messages.push({ role: 'system', content: systemParts.join('\n\n') });
  }
  messages.push({ role: 'user', content: userContent });

  const body: Record<string, unknown> = { model: chosenModel, messages };
  if (typeof temperature === 'number') body.temperature = temperature;
  if (typeof max_tokens === 'number') body.max_tokens = max_tokens;
  if (wantsJson) body.response_format = { type: 'json_object' };

  const text = await chatCompletion(cfg, body);
  if (!wantsJson) return text;

  const parsed = parseJsonResponse(text, response_json_schema);
  assertMatchesSchema(parsed, response_json_schema);
  return parsed;
}

async function chatCompletion(
  cfg: LLMConfig,
  body: Record<string, unknown>,
  attempt = 0,
): Promise<string> {
  const timeoutMs = getTimeoutMs();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new LLMError(`Nous API timeout after ${timeoutMs}ms`, 504));
    }, timeoutMs);
  });

  let res: Response;
  try {
    res = await Promise.race([
      fetch(`${cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new LLMError(`Nous API timeout after ${timeoutMs}ms`, 504);
    }
    throw err;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');

    // Some models reject response_format; the schema is also in the system
    // prompt, so retry once without it — but only when the error actually
    // complains about the response format (never retry a plain 400, and
    // never more than once).
    const mentionsJsonFormat = /response_format|json/i.test(errText);
    if (res.status === 400 && body.response_format && attempt === 0 && mentionsJsonFormat) {
      const { response_format: _dropped, ...rest } = body;
      return chatCompletion(cfg, rest, attempt + 1);
    }

    throw new LLMError(
      `Nous API error ${res.status}: ${errText.slice(0, 500)}`,
      res.status >= 500 ? 502 : res.status,
    );
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  const message = choice?.message ?? {};
  const content = message.content;

  const hasTextContent = typeof content === 'string' && content.length > 0;
  const joinedParts = Array.isArray(content)
    ? content.map((part: any) => (typeof part?.text === 'string' ? part.text : '')).join('')
    : '';

  if (hasTextContent) return content;
  if (joinedParts) return joinedParts;

  // No usable content: either the model refused, or something is wrong.
  const filtered = choice?.finish_reason === 'content_filter';
  if (message.refusal || filtered) {
    throw new LLMError(`Model refused: ${message.refusal || 'content_filter'}`, 422);
  }

  throw new LLMError('Nous API returned no message content');
}

function extractBraces(text: string, open: string, close: string): string | null {
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

/**
 * Parse an LLM answer as JSON, tolerating markdown fences and surrounding prose.
 *
 * The prose-extraction fallback prefers a `{...}` slice (the common case,
 * and what every schema in this codebase declares at the top level) before
 * falling back to `[...]`, so stray brackets in preamble text — e.g.
 * "Here is the result [as requested]: {"a":1}" — don't get sliced first.
 * Pass the `response_json_schema` (if the caller has one) to flip that
 * preference for schemas whose top-level type is `array`.
 */
export function parseJsonResponse(text: string, schema?: Record<string, unknown>): any {
  const trimmed = String(text ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to extraction
  }

  const preferArrayFirst = (schema as any)?.type === 'array';
  const candidates = preferArrayFirst
    ? [extractBraces(trimmed, '[', ']'), extractBraces(trimmed, '{', '}')]
    : [extractBraces(trimmed, '{', '}'), extractBraces(trimmed, '[', ']')];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new LLMError('LLM response was not valid JSON');
}

/**
 * Verify a parsed LLM response against the JSON schema that was requested.
 *
 * Checks two things: every key in `schema.required` exists on `value`, and
 * every top-level `schema.properties` key declared as `array` or `object`
 * exists on `value` with the matching JS type (the failure mode this guards
 * against is the model silently dropping a whole section of the answer).
 * This is a shallow, structural check — not full JSON-schema validation.
 *
 * @throws LLMError (502) naming the missing/mistyped keys
 */
export function assertMatchesSchema(value: any, schema: Record<string, unknown> | undefined): void {
  if (!schema || typeof schema !== 'object') return;

  const missing: string[] = [];
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);

  const required = Array.isArray((schema as any).required) ? (schema as any).required as string[] : [];
  for (const key of required) {
    if (!isObject || !(key in value) || value[key] === undefined) {
      missing.push(key);
    }
  }

  const properties = (schema as any).properties;
  if (properties && typeof properties === 'object') {
    for (const [key, def] of Object.entries(properties as Record<string, any>)) {
      const declaredType = def?.type;
      if (declaredType !== 'array' && declaredType !== 'object') continue;
      if (missing.includes(key)) continue;

      const actual = isObject ? value[key] : undefined;
      const rightType = declaredType === 'array'
        ? Array.isArray(actual)
        : actual !== null && typeof actual === 'object' && !Array.isArray(actual);

      if (!rightType) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new LLMError(
      `LLM response does not match the requested schema: missing ${missing.join(', ')}`,
      502,
    );
  }
}
