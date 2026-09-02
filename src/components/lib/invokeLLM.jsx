import { base44 } from "@/api/base44Client";

/**
 * Frontend entry point for LLM calls.
 *
 * Calls the backend `invokeLLM` function (Nous Research models, see
 * base44/functions/utils/nousLLM) so the API key never reaches the browser.
 * Returns what base44.integrations.Core.InvokeLLM used to return: a string,
 * or the parsed object when `response_json_schema` is passed.
 *
 * @param {{prompt: string, file_urls?: string[], response_json_schema?: object, system?: string}} params
 * @returns {Promise<string|object>}
 */
export async function invokeLLM({ prompt, file_urls, response_json_schema, system }) {
  try {
    const response = await base44.functions.invoke("invokeLLM", {
      prompt,
      file_urls,
      response_json_schema,
      system,
    });

    return response.data.result;
  } catch (error) {
    throw new Error(error?.response?.data?.error || error?.message || "LLM request failed");
  }
}
