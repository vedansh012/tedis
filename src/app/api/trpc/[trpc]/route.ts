import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/context";
import { isDev } from "@/config/env";

/**
 * Single tRPC HTTP endpoint. The fetch adapter lets us mutate response headers
 * (Set-Cookie for login/logout) via the context's resHeaders.
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: isDev
      ? ({ path, error }) => {
          console.error(`❌ tRPC ${path ?? "<no-path>"}: ${error.message}`);
        }
      : undefined,
  });

export { handler as GET, handler as POST };
