import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure, protectedMutation } from "../trpc";
import { cursorInput } from "@/lib/pagination";
import { GIT_REPO_URL_MAX, normalizeGitRepoUrl } from "@/features/feed/git-repo";
import * as feed from "@/server/services/feed/feed.service";
import { isTrustedMediaUrl } from "@/server/services/media/storage";

const postTypeEnum = z.enum(["UPDATE", "QUESTION", "RESOURCE", "DISCUSSION", "MILESTONE"]);
const reactableEnum = z.enum(["POST", "PROJECT", "COMMENT"]);
const bookmarkableEnum = z.enum(["POST", "PROJECT", "RESOURCE", "ROADMAP"]);

export const feedRouter = router({
  home: protectedProcedure
    .input(cursorInput.extend({ interestId: z.string().nullish() }))
    .query(({ ctx, input }) => feed.homeFeed(ctx.auth.user.id, input)),

  interest: publicProcedure
    .input(cursorInput.extend({ interestId: z.string() }))
    .query(({ ctx, input }) => feed.interestFeed(input.interestId, ctx.auth?.user.id, input)),

  byUser: publicProcedure
    .input(cursorInput.extend({ userId: z.string() }))
    .query(({ ctx, input }) => feed.userPosts(input.userId, ctx.auth?.user.id, input)),

  post: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => feed.getPost(input.id, ctx.auth?.user.id)),

  saved: protectedProcedure
    .input(cursorInput)
    .query(({ ctx, input }) => feed.listBookmarkedPosts(ctx.auth.user.id, input)),

  createPost: protectedMutation
    .input(
      z.object({
        type: postTypeEnum.optional(),
        // Body may be empty when the post carries media.
        body: z.string().trim().max(5000).default(""),
        interestId: z.string().nullish(),
        projectId: z.string().nullish(),
        linkUrl: z.string().url().nullish(),
        // Optional public Git repo URL (GitHub/GitLab/Bitbucket). Empty/whitespace
        // is treated as "no repo"; anything else must be a valid HTTPS repo URL.
        gitRepoUrl: z
          .string()
          .trim()
          .max(GIT_REPO_URL_MAX)
          .nullish()
          .transform((v) => (v ? v : null))
          .refine((v) => v === null || normalizeGitRepoUrl(v) !== null, {
            message: "Enter a valid GitHub, GitLab, or Bitbucket repository URL.",
          })
          // Persist the canonical form so display metadata is stable.
          .transform((v) => (v ? normalizeGitRepoUrl(v) : null)),
        media: z
          .array(
            z.object({
              type: z.enum(["IMAGE", "VIDEO"]),
              url: z.string().refine(isTrustedMediaUrl, "Media URL is not from a trusted storage backend."),
              thumbnailUrl: z.string().nullish(),
              width: z.number().int().positive().nullish(),
              height: z.number().int().positive().nullish(),
              altText: z.string().max(500).nullish(),
            }),
          )
          .max(6)
          .optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      // A post must have text or media.
      if (!input.body.trim() && !input.media?.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add some text or media to post." });
      }
      return feed.createPost(ctx.auth.user.id, input);
    }),

  toggleReaction: protectedMutation
    .input(z.object({ targetType: reactableEnum, targetId: z.string() }))
    .mutation(({ ctx, input }) => feed.toggleReaction(ctx.auth.user.id, input.targetType, input.targetId)),

  toggleBookmark: protectedMutation
    .input(z.object({ targetType: bookmarkableEnum, targetId: z.string() }))
    .mutation(({ ctx, input }) => feed.toggleBookmark(ctx.auth.user.id, input.targetType, input.targetId)),

  share: protectedMutation
    .input(z.object({ postId: z.string(), target: z.enum(["COPY_LINK", "WEB_SHARE"]).default("COPY_LINK") }))
    .mutation(({ ctx, input }) => feed.sharePost(ctx.auth.user.id, input.postId, input.target)),

  updatePost: protectedMutation
    .input(z.object({ id: z.string(), body: z.string().trim().min(1).max(5000) }))
    .mutation(({ ctx, input }) => feed.updatePost(input.id, ctx.auth.user.id, input.body)),

  deletePost: protectedMutation
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => feed.deletePost(input.id, ctx.auth.user.id)),

  setArchived: protectedMutation
    .input(z.object({ id: z.string(), archived: z.boolean() }))
    .mutation(({ ctx, input }) => feed.setPostArchived(input.id, ctx.auth.user.id, input.archived)),
});
