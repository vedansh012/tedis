import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, protectedMutation } from "../trpc";
import * as chat from "@/server/services/messaging/messaging.service";

/** 1-on-1 direct messaging. Send/typing/read ride the CSRF+auth+rate-limit
 *  mutation pipeline; delivery is broadcast over Redis to the SSE stream. */
export const messageRouter = router({
  conversations: protectedProcedure.query(({ ctx }) => chat.listConversations(ctx.auth.user.id)),

  conversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(({ ctx, input }) => wrap(() => chat.getConversation(ctx.auth.user.id, input.conversationId))),

  openDirect: protectedMutation
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => wrap(() => chat.getOrCreateDirect(ctx.auth.user.id, input.userId))),

  history: protectedProcedure
    .input(z.object({ conversationId: z.string(), cursor: z.string().nullish() }))
    .query(({ ctx, input }) => wrap(() => chat.getMessages(ctx.auth.user.id, input.conversationId, input.cursor ?? undefined))),

  send: protectedMutation
    .input(z.object({ conversationId: z.string(), body: z.string().min(1).max(4000) }))
    .mutation(({ ctx, input }) => wrap(() => chat.sendMessage(ctx.auth.user.id, input.conversationId, input.body))),

  markRead: protectedMutation
    .input(z.object({ conversationId: z.string() }))
    .mutation(({ ctx, input }) => wrap(() => chat.markRead(ctx.auth.user.id, input.conversationId))),

  typing: protectedMutation
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await chat.sendTyping(ctx.auth.user.id, input.conversationId);
      return { ok: true as const };
    }),
});

/** Map service errors (forbidden/blocked/etc.) to tRPC codes without leaking internals. */
async function wrap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    const code = message === "Forbidden" ? "FORBIDDEN" : message === "Not found" ? "NOT_FOUND" : "BAD_REQUEST";
    throw new TRPCError({ code, message });
  }
}
