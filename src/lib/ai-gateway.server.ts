import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const createOpenRouterProvider = (apiKey: string) =>
  createOpenRouter({
    apiKey,
  });

export { LORD_MODELS, LORD_SYSTEM_PROMPT, type LordMode } from "./lord-config";