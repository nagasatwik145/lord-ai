/**
 * Server-only chat history helpers backed by Lovable Cloud (Postgres).
 * Imported by the /api/chat server route to persist messages as they stream.
 * Uses the service-role admin client; never import this file from client code.
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getConversations() {
  const sb = await admin();
  const { data, error } = await sb
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getConversation(id: string) {
  const sb = await admin();
  const { data: conv } = await sb.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conv) return null;
  const { data: msgs } = await sb
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  return { ...conv, messages: msgs ?? [] };
}

export async function createConversation(id: string, title: string) {
  const sb = await admin();
  const { data, error } = await sb
    .from("conversations")
    .insert({ id, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConversationTitle(id: string, title: string) {
  const sb = await admin();
  const { data, error } = await sb
    .from("conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteConversation(id: string) {
  const sb = await admin();
  const { data, error } = await sb
    .from("conversations")
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  model?: string,
) {
  const sb = await admin();
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);

  // bump conversation timestamp (fire-and-forget; don't block the insert)
  void sb
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const { data, error } = await sb
    .from("messages")
    .insert({ id, conversation_id: conversationId, role, content, model: model ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}
