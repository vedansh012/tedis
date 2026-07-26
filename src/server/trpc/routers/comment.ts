import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedMutation } from "../trpc";
import { cursorInput } from "@/lib/pagination";
import * as comments from "@/server/services/comment/comment.service";

export const commentRouter = router({
  list: publicProcedure
    .input(cursorInput.extend({ postId: z.string() }))
    .query(({ ctx, input }) => comments.listPostComments(input.postId, ctx.auth?.user.id, input)),

  add: protectedMutation
    .input(z.object({ postId: z.string(), body: z.string().trim().min(1, "Write a comment").max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const res = await comments.addComment(ctx.auth.user.id, input.postId, input.body);
      if (!res.ok) throw new TRPCError({ code: "NOT_FOUND", message: "That post no longer exists." });
      return res.comment;
    }),

  delete: protectedMutation
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const res = await comments.deleteComment(ctx.auth.user.id, input.commentId);
      if (!res.ok) {
        throw new TRPCError({
          code: res.error === "FORBIDDEN" ? "FORBIDDEN" : "NOT_FOUND",
          message: res.error === "FORBIDDEN" ? "You can only delete your own comments." : "Comment not found.",
        });
      }
      return { ok: true as const };
    }),
});
