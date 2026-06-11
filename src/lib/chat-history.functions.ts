import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * NOTE: queries live in ./db/queries which imports better-sqlite3 — a native
 * Node addon that is NOT available in the Cloudflare Workers SSR runtime.
 * We lazy-import inside each handler and swallow errors so the UI degrades
 * gracefully (empty list / null) instead of returning HTTP 500 and blanking
 * the screen. Replace with a Worker-compatible store (D1, Turso, Supabase)
 * for real persistence in production.
 */

async function safeQueries() {
  try {
    return await import("./db/queries");
  } catch (err) {
    console.error("[chat-history] db unavailable:", err);
    return null;
  }
}

export const getConversationsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const q = await safeQueries();
    if (!q) return { conversations: [], fallback: true as const };
    const conversations = await q.getConversations();
    return { conversations, fallback: false as const };
  } catch (err) {
    console.error("[chat-history] getConversations failed:", err);
    return { conversations: [], fallback: true as const };
  }
});

export const getConversationFn = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: id }) => {
    try {
      const q = await safeQueries();
      if (!q) return null;
      return await q.getConversation(id);
    } catch (err) {
      console.error("[chat-history] getConversation failed:", err);
      return null;
    }
  });

export const createConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    try {
      const q = await safeQueries();
      if (!q) return null;
      return await q.createConversation(data.id, data.title);
    } catch (err) {
      console.error("[chat-history] createConversation failed:", err);
      return null;
    }
  });

export const deleteConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: id }) => {
    try {
      const q = await safeQueries();
      if (!q) return null;
      return await q.deleteConversation(id);
    } catch (err) {
      console.error("[chat-history] deleteConversation failed:", err);
      return null;
    }
  });

export const updateConversationTitleFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    try {
      const q = await safeQueries();
      if (!q) return null;
      return await q.updateConversationTitle(data.id, data.title);
    } catch (err) {
      console.error("[chat-history] updateConversationTitle failed:", err);
      return null;
    }
  });
