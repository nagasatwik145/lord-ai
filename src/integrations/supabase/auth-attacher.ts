import type { Middleware } from "@tanstack/react-start";

/**
 * Middleware to attach Supabase authentication context to server functions.
 * This allows server functions to access authenticated user info.
 */
export const attachSupabaseAuth: Middleware = async ({ next }) => {
  // For now, this is a placeholder that just passes through.
  // In a real app, you'd extract the user from a session/JWT here.
  return await next();
};
