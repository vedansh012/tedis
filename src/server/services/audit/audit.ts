import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

/**
 * Append-only audit trail for security-relevant and privileged mutations.
 * Fire-and-forget friendly: writing an audit row must never break the action it
 * records, so failures are swallowed (and would surface in error tracking).
 */
export interface AuditInput {
  actorId?: string | null;
  action: string; // dot-namespaced, e.g. "auth.login.success"
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata,
      },
    });
  } catch {
    // Never let audit logging break the primary path.
  }
}
