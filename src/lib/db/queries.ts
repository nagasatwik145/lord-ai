import { db } from "./index";
import { conversations, messages } from "./schema";
import { desc, eq, sql } from "drizzle-orm";

export async function getConversations() {
  return db.select().from(conversations).orderBy(desc(conversations.updatedAt));
}

export async function getConversation(id: string) {
  const result = db.select().from(conversations).where(eq(conversations.id, id)).get();
  if (!result) return null;

  const msgList = db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt).all();
  return { ...result, messages: msgList };
}

export async function createConversation(id: string, title: string) {
  return db.insert(conversations).values({ id, title }).returning().get();
}

export async function updateConversationTitle(id: string, title: string) {
  return db.update(conversations).set({ title, updatedAt: new Date() }).where(eq(conversations.id, id)).returning().get();
}

export async function deleteConversation(id: string) {
  return db.delete(conversations).where(eq(conversations.id, id)).returning().get();
}

export async function addMessage(conversationId: string, role: "user" | "assistant" | "system", content: string, model?: string) {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  
  // Update conversation timestamp
  db.update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))
    .run();

  return db.insert(messages).values({
    id,
    conversationId,
    role,
    content,
    model
  }).returning().get();
}
