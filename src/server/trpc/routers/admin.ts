import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, adminMutation } from "../trpc";
import * as admin from "@/server/services/admin/admin.service";
import * as mod from "@/server/services/moderation/moderation.service";
import * as interest from "@/server/services/interest/interest.service";
import * as requests from "@/server/services/interest/interest-request.service";
import {
  publishInterestSchema,
  createInterestSchema,
  updateInterestSchema,
} from "@/features/interest/schema";
import { hasAtLeast } from "@/features/admin/roles";

const statusEnum = z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "BANNED"]);
const roleEnum = z.enum(["USER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"]);

/** Publishing/creating/deleting interests is Admin+ (structural change to the taxonomy). */
function assertAdmin(role: string) {
  if (!hasAtLeast(role, "ADMIN")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only an Admin can manage interests." });
  }
}

export const adminRouter = router({
  metrics: adminProcedure.query(() => admin.dashboardMetrics()),

  activity: adminProcedure
    .input(z.object({ days: z.number().int().min(7).max(90).default(14) }).optional())
    .query(({ input }) => admin.activitySeries(input?.days ?? 14)),

  recentActivity: adminProcedure.query(() => admin.recentActivity()),

  users: adminProcedure
    .input(z.object({ query: z.string().optional(), limit: z.number().int().min(1).max(100).optional(), cursor: z.string().nullish() }))
    .query(({ input }) => admin.listUsers(input)),

  setUserStatus: adminMutation
    .input(z.object({ userId: z.string(), status: statusEnum }))
    .mutation(({ ctx, input }) => admin.setUserStatus(ctx.auth.user.id, input.userId, input.status)),

  setUserRole: adminMutation
    .input(z.object({ userId: z.string(), role: roleEnum }))
    .mutation(({ ctx, input }) => {
      // Only Super Admins may grant/revoke roles — prevents privilege escalation.
      if (ctx.adminRole !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only a Super Admin can change roles." });
      }
      if (input.userId === ctx.auth.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You can't change your own role." });
      }
      return admin.setUserRole(ctx.auth.user.id, input.userId, input.role);
    }),

  reports: adminProcedure.query(() => admin.openReports()),

  resolveReport: adminMutation
    .input(z.object({ reportId: z.string(), action: z.enum(["RESOLVED", "DISMISSED"]) }))
    .mutation(({ ctx, input }) => mod.resolveReport(ctx.auth.user.id, input.reportId, input.action)),

  auditLogs: adminProcedure.query(() => admin.recentAuditLogs()),

  // ---- Deleted-post review ------------------------------------------------

  deletedPosts: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(({ input }) => admin.listDeletedPosts(input?.limit ?? 50)),

  restorePost: adminMutation
    .input(z.object({ postId: z.string() }))
    .mutation(({ ctx, input }) => admin.restoreDeletedPost(ctx.auth.user.id, input.postId)),

  // ---- Interests: suggestion queue + taxonomy management ----

  interestRequests: adminProcedure
    .input(z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "MERGED"]).default("PENDING") }).optional())
    .query(({ input }) => requests.listRequests(input?.status ?? "PENDING")),

  interestRequestCount: adminProcedure.query(() => requests.pendingRequestCount()),

  rejectInterestRequest: adminMutation
    .input(z.object({ requestId: z.string(), note: z.string().max(500).optional() }))
    .mutation(({ ctx, input }) => requests.rejectRequest(ctx.auth.user.id, input.requestId, input.note)),

  mergeInterestRequest: adminMutation
    .input(z.object({ requestId: z.string(), intoRequestId: z.string() }))
    .mutation(({ ctx, input }) => requests.mergeRequest(ctx.auth.user.id, input.requestId, input.intoRequestId)),

  publishInterest: adminMutation.input(publishInterestSchema).mutation(({ ctx, input }) => {
    assertAdmin(ctx.adminRole);
    return requests.publishInterest(ctx.auth.user.id, input);
  }),

  interests: adminProcedure.query(() => interest.adminListInterests()),

  createInterest: adminMutation.input(createInterestSchema).mutation(({ ctx, input }) => {
    assertAdmin(ctx.adminRole);
    return interest.createInterest(ctx.auth.user.id, input);
  }),

  updateInterest: adminMutation.input(updateInterestSchema).mutation(({ ctx, input }) => {
    assertAdmin(ctx.adminRole);
    return interest.updateInterest(ctx.auth.user.id, input);
  }),

  deleteInterest: adminMutation.input(z.object({ id: z.string() })).mutation(({ ctx, input }) => {
    assertAdmin(ctx.adminRole);
    return interest.deleteInterest(ctx.auth.user.id, input.id);
  }),
});
