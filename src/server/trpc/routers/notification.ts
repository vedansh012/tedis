import { router, protectedProcedure, protectedMutation } from "../trpc";
import { cursorInput } from "@/lib/pagination";
import * as notifications from "@/server/services/notification/notification.service";

export const notificationRouter = router({
  unreadCount: protectedProcedure.query(({ ctx }) => notifications.unreadCount(ctx.auth.user.id)),

  list: protectedProcedure.input(cursorInput).query(({ ctx, input }) =>
    notifications.listNotifications(ctx.auth.user.id, input),
  ),

  markAllRead: protectedMutation.mutation(async ({ ctx }) => {
    await notifications.markAllRead(ctx.auth.user.id);
    return { ok: true as const };
  }),
});
