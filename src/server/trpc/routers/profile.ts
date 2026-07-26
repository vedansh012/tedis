import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, protectedMutation } from "../trpc";
import { usernameSchema, displayNameSchema } from "@/features/auth/schema";
import { SESSION_COOKIE } from "@/features/auth/constants";
import * as profile from "@/server/services/profile/profile.service";

export const profileRouter = router({
  byUsername: publicProcedure.input(z.object({ username: z.string() })).query(({ ctx, input }) =>
    profile.getProfileByUsername(input.username, ctx.auth?.user.id),
  ),

  checkUsername: publicProcedure.input(z.object({ username: usernameSchema })).query(({ ctx, input }) =>
    profile.isUsernameAvailable(input.username, ctx.auth?.user.id).then((available) => ({ available })),
  ),

  completeOnboarding: protectedMutation
    .input(
      z.object({
        username: usernameSchema,
        headline: z.string().max(120).optional(),
        bio: z.string().max(600).optional(),
        interestIds: z.array(z.string()).min(1, "Pick at least one Interest").max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await profile.completeOnboarding(ctx.auth.user.id, input);
      if (!result.ok) {
        throw new TRPCError({ code: "CONFLICT", message: "That username is taken." });
      }
      return { ok: true as const };
    }),

  update: protectedMutation
    .input(
      z.object({
        displayName: displayNameSchema.optional(),
        headline: z.string().max(120).nullish(),
        bio: z.string().max(600).nullish(),
        location: z.string().max(80).nullish(),
        websiteUrl: z.string().url().nullish().or(z.literal("")),
        avatarUrl: z.string().url().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await profile.updateProfile(ctx.auth.user.id, {
        ...input,
        websiteUrl: input.websiteUrl === "" ? null : input.websiteUrl,
      });
      return { ok: true as const };
    }),

  follow: protectedMutation.input(z.object({ userId: z.string() })).mutation(({ ctx, input }) =>
    profile.follow(ctx.auth.user.id, input.userId),
  ),

  unfollow: protectedMutation.input(z.object({ userId: z.string() })).mutation(({ ctx, input }) =>
    profile.unfollow(ctx.auth.user.id, input.userId),
  ),

  deleteAccount: protectedMutation
    .input(z.object({ password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const res = await profile.deleteOwnAccount(ctx.auth.user.id, input.password);
      if (!res.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Incorrect password." });
      ctx.clearCookie(SESSION_COOKIE); // log the (now-deleted) session out immediately
      return { ok: true as const };
    }),

  suggested: protectedProcedure.query(({ ctx }) => profile.suggestedPeople(ctx.auth.user.id)),

  following: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => profile.listFollowing(input.userId)),
});
