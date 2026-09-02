/**
 * Browser client for Nous Research's OpenAI-compatible inference API.
 *
 * Promptster runs on a Base44 plan without backend functions, so every LLM
 * call goes straight from the browser to Nous. The API key is NOT in the
 * bundle: it lives in the signed-in user's AISettings row and is loaded into
 * this module by NousKeyLoader (see src/components/ai/NousKeyLoader.jsx)
 * via configureNous(). Text goes to DEFAULT_TEXT_MODEL; requests that carry
 * `file_urls` (images) go to DEFAULT_VISION_MODEL.
 *
 * Return contract (same as the old backend module): a string, or — when
 * `response_json_schema` is given — the parsed object, checked against the
 * schema's required keys and array/object-typed properties.
 *
 * @module nousClient
 */

export const DEFAULT_BASE_URL = "https://inference-api.nousresearch.com/v1";
export const DEFAULT_TEXT_MODEL = "deepseek/deepseek-v4-flash-0731";
export const DEFAULT_VISION_MODEL = "deepseek/deepseek-v4-flash-vision-exp";
// Safety net against a hung connection, not a cap on generation: one
// non-streaming call returns the whole answer at once, and long outputs
// (3 full prompt variants, an improved multi-task prompt) measured 50-150 s
// live. 90 s cut Variants off mid-generation.
export const DEFAULT_TIMEOUT_MS = 300_000;

export class NousError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "NousError";
    this.status = status;
  }
}

const config = {
  apiKey: undefined,
  baseUrl: DEFAULT_BASE_URL,
  textModel: DEFAULT_TEXT_MODEL,
  visionModel: DEFAULT_VISION_MODEL,
  timeoutMs: DEFAULT_TIMEOUT_MS,
};

/**
 * Set or update the client configuration. Empty/undefined values fall back
 * to the defaults, so passing `{ apiKey }` alone is enough.
 */
export function configureNous({ apiKey, baseUrl, textModel, visionModel, timeoutMs } = {}) {
  config.apiKey = apiKey?.trim() || undefined;
  config.baseUrl = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  config.textModel = textModel?.trim() || DEFAULT_TEXT_MODEL;
  config.visionModel = visionModel?.trim() || DEFAULT_VISION_MODEL;
  const t = Number(timeoutMs);
  config.timeoutMs = Number.isFinite(t) && t > 0 ? t : DEFAULT_TIMEOUT_MS;
}

/** Forget the key (e.g. on logout). */
export function resetNous() {
  configureNous({});
}

export function getNousConfig() {
  return { ...config };
}

export function isNousConfigured() {
  return !!config.apiKey;
}

export const NOT_CONFIGURED_MESSAGE =
  "Geen Nous-sleutel ingesteld. Vul je Nous Research API-sleutel in bij AI Backoffice.";

/**
 * Send a prompt (optionally with images and/or a JSON schema) to the LLM.
 *
 * @param {{prompt: string, file_urls?: string[], response_json_schema?: object, system?: string, model?: string, temperature?: number, max_tokens?: number}} params
 * @returns {Promise<string|object>} string, or the parsed object when `response_json_schema` is set
 * @throws NousError with an HTTP-ish status when config or the API call fails
 */
export async function invokeLLM(params) {
  const { prompt, file_urls, response_json_schema, system, model, temperature, max_tokens } = params || {};

  if (!prompt || typeof prompt !== "string") {
    throw new NousError("prompt is required", 400);
  }
  if (!config.apiKey) {
    throw new NousError(NOT_CONFIGURED_MESSAGE, 401);
  }

  const images = Array.isArray(file_urls)
    ? file_urls.filter((u) => typeof u === "string" && u.length > 0)
    : [];
  const wantsJson = !!response_json_schema;
  const chosenModel = model || (images.length > 0 ? config.visionModel : config.textModel);

  const systemParts = [];
  if (system) systemParts.push(system);
  if (wantsJson) {
    systemParts.push(
      "Respond with a single JSON object only: no prose, no markdown fences. " +
        "The object must match this JSON schema:\n" +
        JSON.stringify(response_json_schema),
    );
  }

  const userContent = images.length > 0
    ? [
        { type: "text", text: prompt },
        ...images.map((url) => ({ type: "image_url", image_url: { url } })),
      ]
    : prompt;

  const messages = [];
  if (systemParts.length > 0) {
    messages.push({ role: "system", content: systemParts.join("\n\n") });
  }
  messages.push({ role: "user", content: userContent });

  const body = { model: chosenModel, messages };
  if (typeof temperature === "number") body.temperature = temperature;
  if (typeof max_tokens === "number") body.max_tokens = max_tokens;
  if (wantsJson) body.response_format = { type: "json_object" };

  const text = await chatCompletion(body);
  if (!wantsJson) return text;

  const parsed = parseJsonResponse(text, response_json_schema);
  assertMatchesSchema(parsed, response_json_schema);
  return parsed;
}

async function chatCompletion(body, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  let res;
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new NousError(`Nous API timeout after ${config.timeoutMs}ms`, 504);
    }
    throw new NousError(`Nous API unreachable: ${err?.message || err}`, 502);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");

    // Some models reject response_format; the schema is also in the system
    // prompt, so retry once without it — only when the error is about the
    // response format, never on a plain 400, never more than once.
    const mentionsJsonFormat = /response_format|json/i.test(errText);
    if (res.status === 400 && body.response_format && attempt === 0 && mentionsJsonFormat) {
      const { response_format: _dropped, ...rest } = body;
      return chatCompletion(rest, attempt + 1);
    }

    if (res.status === 401) {
      throw new NousError("Nous API weigert de sleutel (401). Controleer de sleutel bij AI Backoffice.", 401);
    }
    throw new NousError(
      `Nous API error ${res.status}: ${errText.slice(0, 500)}`,
      res.status >= 500 ? 502 : res.status,
    );
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  const message = choice?.message ?? {};
  const content = message.content;

  const hasTextContent = typeof content === "string" && content.length > 0;
  const joinedParts = Array.isArray(content)
    ? content.map((part) => (typeof part?.text === "string" ? part.text : "")).join("")
    : "";

  if (hasTextContent) return content;
  if (joinedParts) return joinedParts;

  const filtered = choice?.finish_reason === "content_filter";
  if (message.refusal || filtered) {
    throw new NousError(`Model refused: ${message.refusal || "content_filter"}`, 422);
  }

  throw new NousError("Nous API returned no message content");
}

function extractBraces(text, open, close) {
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

/**
 * Parse an LLM answer as JSON, tolerating markdown fences and surrounding
 * prose. Prefers a `{...}` slice over `[...]` unless the schema's top-level
 * type is `array`.
 */
export function parseJsonResponse(text, schema) {
  const trimmed = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to extraction
  }

  const preferArrayFirst = schema?.type === "array";
  const candidates = preferArrayFirst
    ? [extractBraces(trimmed, "[", "]"), extractBraces(trimmed, "{", "}")]
    : [extractBraces(trimmed, "{", "}"), extractBraces(trimmed, "[", "]")];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new NousError("LLM response was not valid JSON");
}

/**
 * Shallow structural check of a parsed answer against the requested schema:
 * every `required` key must exist, and every top-level property declared as
 * `array`/`object` must have that JS type. Guards against the model dropping
 * a whole section of the answer.
 *
 * @throws NousError (502) naming the missing/mistyped keys
 */
export function assertMatchesSchema(value, schema) {
  if (!schema || typeof schema !== "object") return;

  const missing = [];
  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);

  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    if (!isObject || !(key in value) || value[key] === undefined) {
      missing.push(key);
    }
  }

  const properties = schema.properties;
  if (properties && typeof properties === "object") {
    for (const [key, def] of Object.entries(properties)) {
      const declaredType = def?.type;
      if (declaredType !== "array" && declaredType !== "object") continue;
      if (missing.includes(key)) continue;

      const actual = isObject ? value[key] : undefined;
      const rightType = declaredType === "array"
        ? Array.isArray(actual)
        : actual !== null && typeof actual === "object" && !Array.isArray(actual);

      if (!rightType) missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new NousError(
      `LLM response does not match the requested schema: missing ${missing.join(", ")}`,
      502,
    );
  }
}
