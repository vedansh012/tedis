import { z } from "zod";
import { router, publicProcedure, assertReadRateLimit } from "../trpc";
import { globalSearch } from "@/server/services/search/search.service";

export const searchRouter = router({
  global: publicProcedure
    .input(z.object({ query: z.string().max(100) }))
    .query(async ({ ctx, input }) => {
      // Search runs several ILIKE queries; throttle per actor to keep it from
      // being used as a cheap DB-load amplifier.
      await assertReadRateLimit(ctx.auth?.user.id ?? ctx.ipAddress ?? "anon", 30, 60_000);
      return globalSearch(input.query);
    }),
});
