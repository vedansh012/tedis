import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedMutation } from "../trpc";
import { cursorInput } from "@/lib/pagination";
import * as community from "@/server/services/community/community.service";

const visibilityEnum = z.enum(["PUBLIC", "RESTRICTED", "PRIVATE"]);

export const communityRouter = router({
  list: publicProcedure
    .input(cursorInput.extend({ interestId: z.string().nullish() }))
    .query(({ input }) => community.listCommunities(input)),

  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ ctx, input }) =>
    community.getCommunityBySlug(input.slug, ctx.auth?.user.id),
  ),

  threads: publicProcedure
    .input(cursorInput.extend({ communityId: z.string() }))
    .query(({ input }) => community.listThreads(input.communityId, input)),

  thread: publicProcedure.input(z.object({ threadId: z.string() })).query(({ input }) =>
    community.getThread(input.threadId),
  ),

  create: protectedMutation
    .input(
      z.object({
        interestId: z.string(),
        name: z.string().trim().min(3).max(60),
        purpose: z.string().max(140).optional(),
        description: z.string().max(2000).optional(),
        visibility: visibilityEnum.optional(),
      }),
    )
    .mutation(({ ctx, input }) => community.createCommunity(ctx.auth.user.id, input)),

  join: protectedMutation.input(z.object({ communityId: z.string() })).mutation(({ ctx, input }) =>
    community.joinCommunity(ctx.auth.user.id, input.communityId),
  ),

  leave: protectedMutation.input(z.object({ communityId: z.string() })).mutation(({ ctx, input }) =>
    community.leaveCommunity(ctx.auth.user.id, input.communityId),
  ),

  createThread: protectedMutation
    .input(z.object({ communityId: z.string(), title: z.string().trim().min(3).max(160), body: z.string().trim().min(1).max(10000) }))
    .mutation(async ({ ctx, input }) => {
      const res = await community.createThread(ctx.auth.user.id, input.communityId, input);
      if (!res.ok) throw new TRPCError({ code: "FORBIDDEN", message: "Join the community to start a discussion." });
      return { ok: true as const, threadId: res.threadId };
    }),

  createReply: protectedMutation
    .input(z.object({ threadId: z.string(), body: z.string().trim().min(1).max(10000) }))
    .mutation(async ({ ctx, input }) => {
      const res = await community.createReply(ctx.auth.user.id, input.threadId, input);
      if (!res.ok) {
        const msg =
          res.error === "LOCKED" ? "This thread is locked."
          : res.error === "NOT_MEMBER" ? "Join the community to reply."
          : "Thread not found.";
        throw new TRPCError({ code: "FORBIDDEN", message: msg });
      }
      return { ok: true as const, replyId: res.replyId };
    }),
});
