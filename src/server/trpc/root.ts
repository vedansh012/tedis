import { router, createCallerFactory, publicProcedure } from "./trpc";
import { prisma } from "@/server/db/prisma";
import { authRouter } from "./routers/auth";
import { interestRouter } from "./routers/interest";
import { feedRouter } from "./routers/feed";
import { profileRouter } from "./routers/profile";
import { projectRouter } from "./routers/project";
import { notificationRouter } from "./routers/notification";
import { communityRouter } from "./routers/community";
import { searchRouter } from "./routers/search";
import { commentRouter } from "./routers/comment";
import { adminRouter } from "./routers/admin";
import { moderationRouter } from "./routers/moderation";
import { messageRouter } from "./routers/message";

/**
 * The application's typed API surface. Feature routers mount here.
 */
export const appRouter = router({
  auth: authRouter,
  interest: interestRouter,
  feed: feedRouter,
  profile: profileRouter,
  project: projectRouter,
  notification: notificationRouter,
  community: communityRouter,
  search: searchRouter,
  comment: commentRouter,
  admin: adminRouter,
  moderation: moderationRouter,
  message: messageRouter,
  // Small reference lookup used by the project composer.
  technology: router({
    list: publicProcedure.query(() =>
      prisma.technology.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, iconKey: true },
      }),
    ),
  }),
});

export type AppRouter = typeof appRouter;

/** Server-side caller factory — used by RSC and tests to call procedures directly. */
export const createCaller = createCallerFactory(appRouter);
