import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Creates a provider using Vercel AI Gateway.
 * Supports multiple providers through the gateway.
 */
export const createOpenRouterProvider = (apiKey: string) => {
  return createOpenRouter({
    apiKey,
  });
};

export { LORD_MODELS, LORD_SYSTEM_PROMPT, type LordMode } from "./lord-config";
