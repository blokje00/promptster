import { invokeLLM as nousInvoke } from "@/lib/nousClient";

/**
 * Frontend entry point for LLM calls.
 *
 * This Base44 plan has no backend functions (every call to /functions/*
 * returns 402 "Functions are blocked"), so the call goes straight from the
 * browser to Nous Research via src/lib/nousClient.js. The API key never
 * enters the bundle — it's loaded per-session from the signed-in user's
 * AISettings row by src/components/ai/NousKeyLoader.jsx. Returns what
 * base44.integrations.Core.InvokeLLM used to return: a string, or the
 * parsed object when `response_json_schema` is passed.
 *
 * @param {{prompt: string, file_urls?: string[], response_json_schema?: object, system?: string}} params
 * @returns {Promise<string|object>}
 */
export async function invokeLLM({ prompt, file_urls, response_json_schema, system }) {
  try {
    return await nousInvoke({ prompt, file_urls, response_json_schema, system });
  } catch (error) {
    throw new Error(error?.message || "LLM request failed");
  }
}
