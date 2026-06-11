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
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return new Response("Missing OPENROUTER_API_KEY", { status: 500 });
        }

        const body = (await request.json()) as {
          messages: UIMessage[];
          mode?: LordMode;
          context?: unknown;
          conversationId?: string;
        };
        const mode: LordMode = body.mode && body.mode in LORD_MODELS ? body.mode : "balanced";
        const modelId = LORD_MODELS[mode];
        const conversationId = body.conversationId;

        // Construct enriched system prompt with application context
        let systemPrompt = LORD_SYSTEM_PROMPT;
        if (body.context) {
          systemPrompt += `\n\nCURRENT APPLICATION CONTEXT:\n${JSON.stringify(body.context, null, 2)}`;
        }

        try {
          // Persistence is best-effort: a missing/unavailable database must
          // never block the AI response.
          let persist: typeof import("@/lib/db/queries") | null = null;
          try {
            persist = await import("@/lib/db/queries");
          } catch (e) {
            console.error("[chat] history persistence unavailable:", e);
          }

          if (persist && conversationId) {
            const lastUserMessage = body.messages[body.messages.length - 1];
            if (lastUserMessage && lastUserMessage.role === "user") {
              const content = lastUserMessage.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              try {
                // Ensure conversation exists
                await persist
                  .createConversation(conversationId, "New Conversation")
                  .catch(() => {});
                await persist.addMessage(conversationId, "user", content);
                // If it's the first message, update title
                if (body.messages.length === 1) {
                  const title = content.slice(0, 40) + (content.length > 40 ? "..." : "");
                  await persist.updateConversationTitle(conversationId, title);
                }
              } catch (e) {
                console.error("[chat] failed to persist user message:", e);
              }
            }
          }

          const gateway = createOpenRouterProvider(apiKey);
          const result = streamText({
            model: gateway(modelId),
            system: systemPrompt,
            messages: await convertToModelMessages(body.messages),
            onFinish: async ({ text }) => {
              if (persist && conversationId) {
                await persist
                  .addMessage(conversationId, "assistant", text, modelId)
                  .catch((e) => console.error("[chat] failed to persist assistant message:", e));
              }
            },
          });
          return result.toUIMessageStreamResponse();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
