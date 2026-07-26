import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";

/** Inferred, always-in-sync client types for every procedure. */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;

export type FeedItem = RouterOutputs["feed"]["home"]["items"][number];
