import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createOpenRouterProvider,
  LORD_MODELS,
  LORD_SYSTEM_PROMPT,
  type LordMode,
} from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Try AI_GATEWAY_API_KEY first (Vercel AI Gateway), then OPENROUTER_API_KEY
        const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
          console.error(
            "[LORD] Missing API key: Neither AI_GATEWAY_API_KEY nor OPENROUTER_API_KEY is set",
          );
          return new Response(
            JSON.stringify({
              error: "API configuration missing",
              details: "No API key configured for AI provider",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        try {
          const body = (await request.json()) as {
            messages: UIMessage[];
            mode?: LordMode;
            context?: Record<string, unknown>;
            conversationId?: string;
          };

          const mode: LordMode = body.mode && body.mode in LORD_MODELS ? body.mode : "balanced";
          const modelId = LORD_MODELS[mode];
          const conversationId = body.conversationId;

          console.log("[LORD] Chat request:", {
            mode,
            modelId,
            messageCount: body.messages.length,
            apiKey: apiKey ? "set" : "missing",
          });

          // Construct enriched system prompt with application context
          let systemPrompt = LORD_SYSTEM_PROMPT;
          if (body.context) {
            systemPrompt += `\n\nCURRENT APPLICATION CONTEXT:\n${JSON.stringify(body.context, null, 2)}`;
          }

          // Try to save messages if database is available
          try {
            const { addMessage, createConversation, updateConversationTitle } =
              await import("@/lib/db/queries");

            if (conversationId) {
              const lastUserMessage = body.messages[body.messages.length - 1];
              if (lastUserMessage && lastUserMessage.role === "user") {
                const content = lastUserMessage.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");

                try {
                  await createConversation(conversationId, "New Conversation");
                } catch (e) {
                  // Ignore if already exists
                }

                await addMessage(conversationId, "user", content);

                if (body.messages.length === 1) {
                  const title = content.slice(0, 40) + (content.length > 40 ? "..." : "");
                  await updateConversationTitle(conversationId, title);
                }
              }
            }
          } catch (dbErr) {
            console.warn("[LORD] Database unavailable, continuing without persistence:", dbErr);
          }

          try {
            const gateway = createOpenRouterProvider(apiKey);
            console.log("[LORD] Creating stream with model:", modelId);
            const result = streamText({
              model: gateway(modelId),
              system: systemPrompt,
              messages: await convertToModelMessages(body.messages),
              onFinish: async ({ text }) => {
                if (conversationId) {
                  try {
                    const { addMessage } = await import("@/lib/db/queries");
                    await addMessage(conversationId, "assistant", text, modelId);
                  } catch (e) {
                    console.warn("[LORD] Failed to save assistant message:", e);
                  }
                }
              },
            });

            return result.toUIMessageStreamResponse();
          } catch (streamErr) {
            console.error("[LORD] Stream error:", streamErr);
            throw streamErr;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          console.error("[LORD] Chat API error:", errorMsg, err);

          return new Response(
            JSON.stringify({
              error: errorMsg,
              type: err instanceof Error ? err.constructor.name : "Error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
