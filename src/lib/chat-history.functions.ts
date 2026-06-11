import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Chat history persistence backed by Lovable Cloud (Postgres).
 * All access flows through the service-role admin client, loaded
 * lazily inside each handler so the server-only module never leaks
 * into the client bundle.
 */

type ConversationListItem = { id: string; title: string; updatedAt: string };

type ChatHistoryUnavailableResult = {
  persistenceAvailable: false;
  error: string;
};

function getChatHistoryError(error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  return `Chat history persistence is unavailable: ${detail}`;
}

function logChatHistoryError(operation: string, error: unknown) {
  console.error(`[chat-history] ${operation}:`, error);
}

export const getConversationsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      logChatHistoryError("getConversations", error);
      return {
        conversations: [] as ConversationListItem[],
        persistenceAvailable: false,
        error: error.message,
      };
    }

    return {
      persistenceAvailable: true,
      conversations: (data ?? []).map((c: { id: string; title: string; updated_at: string }) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updated_at,
      })),
    };
  } catch (error) {
    logChatHistoryError("getConversations", error);
    return {
      conversations: [] as ConversationListItem[],
      persistenceAvailable: false,
      error: getChatHistoryError(error),
    } satisfies { conversations: ConversationListItem[] } & ChatHistoryUnavailableResult;
  }
});

export const getConversationFn = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: id }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: conv, error: convErr } = await supabaseAdmin
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();

      if (convErr) {
        logChatHistoryError("getConversation", convErr);
        return { persistenceAvailable: false, error: convErr.message, messages: [] };
      }

      if (!conv) return null;

      const { data: msgs, error: msgErr } = await supabaseAdmin
        .from("messages")
        .select("id, role, content, model, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (msgErr) {
        logChatHistoryError("getConversation messages", msgErr);
        return { ...conv, messages: [], persistenceAvailable: false, error: msgErr.message };
      }
      return { ...conv, messages: msgs ?? [], persistenceAvailable: true };
    } catch (error) {
      logChatHistoryError("getConversation", error);
      return { persistenceAvailable: false, error: getChatHistoryError(error), messages: [] };
    }
  });

export const createConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("conversations")
        .upsert({ id: data.id, title: data.title }, { onConflict: "id" });
      if (error) {
        logChatHistoryError("createConversation", error);
        return {
          id: data.id,
          title: data.title,
          persistenceAvailable: false,
          error: error.message,
        };
      }
      return { id: data.id, title: data.title, persistenceAvailable: true };
    } catch (error) {
      logChatHistoryError("createConversation", error);
      return {
        id: data.id,
        title: data.title,
        persistenceAvailable: false,
        error: getChatHistoryError(error),
      };
    }
  });

export const deleteConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: id }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("conversations").delete().eq("id", id);
      if (error) {
        logChatHistoryError("deleteConversation", error);
        return { id, persistenceAvailable: false, error: error.message };
      }
      return { id, persistenceAvailable: true };
    } catch (error) {
      logChatHistoryError("deleteConversation", error);
      return { id, persistenceAvailable: false, error: getChatHistoryError(error) };
    }
  });

export const updateConversationTitleFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("conversations")
        .update({ title: data.title, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      if (error) {
        logChatHistoryError("updateConversationTitle", error);
        return {
          id: data.id,
          title: data.title,
          persistenceAvailable: false,
          error: error.message,
        };
      }
      return { id: data.id, title: data.title, persistenceAvailable: true };
    } catch (error) {
      logChatHistoryError("updateConversationTitle", error);
      return {
        id: data.id,
        title: data.title,
        persistenceAvailable: false,
        error: getChatHistoryError(error),
      };
    }
  });
