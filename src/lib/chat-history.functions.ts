import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Chat history is currently a no-op on the Cloudflare Workers runtime.
 *
 * The original implementation used better-sqlite3 (a native Node addon),
 * which cannot run on workerd. Importing it — even dynamically — leaks a
 * native binding into the bundle and crashes the worker before our
 * try/catch can react, which is why the published site returned the
 * generic 500 SSR fallback page.
 *
 * Until we swap in a Worker-compatible store (D1, Turso, Supabase, etc.),
 * these fns return empty/null fallbacks so the UI degrades gracefully.
 */

export const getConversationsFn = createServerFn({ method: "GET" }).handler(async () => {
  return { conversations: [] as Array<{ id: string; title: string; updatedAt: string }>, fallback: true as const };
});

export const getConversationFn = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async () => {
    return null;
  });

export const createConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    return { id: data.id, title: data.title };
  });

export const deleteConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async () => {
    return null;
  });

export const updateConversationTitleFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    return { id: data.id, title: data.title };
  });
