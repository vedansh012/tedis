import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/trpc/root";

/** Typed tRPC React hooks. Import `trpc` anywhere on the client. */
export const trpc = createTRPCReact<AppRouter>();
