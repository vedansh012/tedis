import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, adminMutation } from "../trpc";
import * as admin from "@/server/services/admin/admin.service";
import * as mod from "@/server/services/moderation/moderation.service";

const statusEnum = z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "BANNED"]);
const roleEnum = z.enum(["USER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"]);

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
});
