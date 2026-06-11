import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Chat history persistence backed by Lovable Cloud (Postgres).
 * All access flows through the service-role admin client, loaded
 * lazily inside each handler so the server-only module never leaks
 * into the client bundle.
 */

export const getConversationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[chat-history] getConversations:", error);
    return { conversations: [] as Array<{ id: string; title: string; updatedAt: string }>, error: error.message };
  }
  return {
    conversations: (data ?? []).map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at })),
  };
});

export const getConversationFn = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: id }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (convErr || !conv) return null;
    const { data: msgs, error: msgErr } = await supabaseAdmin
      .from("messages")
      .select("id, role, content, model, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (msgErr) {
      console.error("[chat-history] getConversation messages:", msgErr);
      return { ...conv, messages: [] };
    }
    return { ...conv, messages: msgs ?? [] };
  });

export const createConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("conversations")
      .upsert({ id: data.id, title: data.title }, { onConflict: "id" });
    if (error) console.error("[chat-history] createConversation:", error);
    return { id: data.id, title: data.title };
  });

export const deleteConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: id }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("conversations").delete().eq("id", id);
    if (error) console.error("[chat-history] deleteConversation:", error);
    return { id };
  });

export const updateConversationTitleFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("conversations")
      .update({ title: data.title, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) console.error("[chat-history] updateConversationTitle:", error);
    return { id: data.id, title: data.title };
  });
