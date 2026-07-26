import { z } from "zod";
import { router, publicProcedure, protectedProcedure, protectedMutation } from "../trpc";
import { cursorInput } from "@/lib/pagination";
import * as interest from "@/server/services/interest/interest.service";

export const interestRouter = router({
  list: publicProcedure.query(() => interest.listInterests()),

  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ ctx, input }) =>
    interest.getInterestBySlug(input.slug, ctx.auth?.user.id),
  ),

  mine: protectedProcedure.query(({ ctx }) => interest.getUserInterests(ctx.auth.user.id)),

  members: publicProcedure
    .input(cursorInput.extend({ interestId: z.string() }))
    .query(({ input }) => interest.listInterestMembers(input.interestId, input)),

  join: protectedMutation.input(z.object({ interestId: z.string() })).mutation(async ({ ctx, input }) => {
    await interest.joinInterest(ctx.auth.user.id, input.interestId);
    return { ok: true as const };
  }),

  leave: protectedMutation.input(z.object({ interestId: z.string() })).mutation(async ({ ctx, input }) => {
    await interest.leaveInterest(ctx.auth.user.id, input.interestId);
    return { ok: true as const };
  }),
});
