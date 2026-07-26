import { redirect } from "next/navigation";
import { getServerAuth } from "@/server/auth/current-user";
import { prisma } from "@/server/db/prisma";
import { AppShell } from "@/components/app/app-shell";

/**
 * Authenticated shell. Server Component gate: unauthenticated → /login,
 * authenticated-but-not-onboarded → /onboarding. Everything below assumes a
 * fully onboarded user.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  if (!auth.user.onboardedAt) redirect("/onboarding");

  const profile = await prisma.profile.findUnique({
    where: { userId: auth.user.id },
    select: { avatarUrl: true },
  });

  return (
    <AppShell
      user={{
        username: auth.user.username,
        displayName: auth.user.displayName,
        avatarUrl: profile?.avatarUrl ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
