import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { getServerAuth } from "./current-user";
import { isStaff, type Role } from "@/features/admin/roles";

export interface AdminActor {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

/**
 * Gate for admin Server Components / route handlers. Returns 404 (not 403) for
 * non-staff so the admin panel's very existence isn't disclosed. Re-reads the
 * role from the DB so a demotion takes effect immediately (not stuck in a stale
 * session).
 */
export async function requireAdmin(): Promise<AdminActor> {
  const auth = await getServerAuth();
  if (!auth) notFound();
  const me = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, username: true, displayName: true, role: true },
  });
  if (!me || !isStaff(me.role)) notFound();
  return me as AdminActor;
}
