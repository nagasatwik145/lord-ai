import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as queries from "./db/queries";

export const getConversationsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    return queries.getConversations();
  });

export const getConversationFn = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(async ({ data: id }) => {
    return queries.getConversation(id);
  });

export const createConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    return queries.createConversation(data.id, data.title);
  });

export const deleteConversationFn = createServerFn({ method: "POST" })
  .inputValidator(z.string())
  .handler(async ({ data: id }) => {
    return queries.deleteConversation(id);
  });

export const updateConversationTitleFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string(), title: z.string() }))
  .handler(async ({ data }) => {
    return queries.updateConversationTitle(data.id, data.title);
  });
