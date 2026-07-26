import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, protectedMutation } from "../trpc";
import { REPORT_REASON_VALUES, REPORT_TARGETS } from "@/features/moderation/constants";
import * as mod from "@/server/services/moderation/moderation.service";

export const moderationRouter = router({
  // ---- user-facing trust & safety ----
  report: protectedMutation
    .input(
      z.object({
        targetType: z.enum(REPORT_TARGETS),
        targetId: z.string(),
        reason: z.enum(REPORT_REASON_VALUES),
        details: z.string().max(1000).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const res = await mod.submitReport(ctx.auth.user.id, input);
      if (!res.ok) {
        throw new TRPCError({
          code: res.error === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
          message: res.error === "SELF" ? "You can't report your own content." : "Couldn't file that report.",
        });
      }
      return { ok: true as const };
    }),

  block: protectedMutation
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => mod.blockUser(ctx.auth.user.id, input.userId)),

  unblock: protectedMutation
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => mod.unblockUser(ctx.auth.user.id, input.userId)),

  isBlocked: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) => mod.isBlockedEitherWay(ctx.auth.user.id, input.userId)),
});
