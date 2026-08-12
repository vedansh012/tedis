import { z } from "zod";
import { router, publicProcedure, protectedProcedure, protectedMutation } from "../trpc";
import { cursorInput } from "@/lib/pagination";
import * as project from "@/server/services/project/project.service";
import * as feed from "@/server/services/feed/feed.service";

const statusEnum = z.enum(["IDEA", "BUILDING", "LIVE", "PAUSED", "ARCHIVED"]);

export const projectRouter = router({
  list: publicProcedure
    .input(cursorInput.extend({ interestId: z.string().nullish() }))
    .query(({ input }) => project.listProjects(input)),

  trending: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(12).default(6) }).optional())
    .query(({ input }) => project.trendingProjects(input?.limit)),

  /** Compact top-N for the right-rail trending panel. */
  trendingPanel: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(8) }).optional())
    .query(({ input }) => project.rankedProjects(input?.limit ?? 8, 0)),

  /** Full ranked leaderboard, paginated (page 0 = top). */
  ranking: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(0).max(200).default(0),
        pageSize: z.number().int().min(1).max(50).default(25),
      }),
    )
    .query(({ input }) => project.rankedProjects(input.pageSize, input.page * input.pageSize)),

  byUser: publicProcedure.input(z.object({ userId: z.string() })).query(({ input }) =>
    project.listUserProjects(input.userId),
  ),

  /** The signed-in user's own projects (for the composer "attach to project" picker). */
  mine: protectedProcedure.query(({ ctx }) => project.listMyProjectsBrief(ctx.auth.user.id)),

  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(({ ctx, input }) =>
    project.getProjectBySlug(input.slug, ctx.auth?.user.id),
  ),

  /** Every post in the project, oldest → newest (the project's story timeline). */
  timeline: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(({ ctx, input }) => feed.projectTimeline(input.projectId, ctx.auth?.user.id)),

  create: protectedMutation
    .input(
      z.object({
        name: z.string().trim().min(2).max(80),
        tagline: z.string().max(140).optional(),
        description: z.string().max(5000).optional(),
        interestId: z.string().nullish(),
        status: statusEnum.optional(),
        repoUrl: z.string().url().nullish().or(z.literal("")),
        coverUrl: z.string().url().nullish(),
        openToCollab: z.boolean().optional(),
        techIds: z.array(z.string()).max(20).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      project.createProject(ctx.auth.user.id, {
        ...input,
        repoUrl: input.repoUrl === "" ? null : input.repoUrl,
      }),
    ),

  delete: protectedMutation
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => project.deleteProject(input.id, ctx.auth.user.id)),
});
