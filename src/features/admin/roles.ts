/**
 * Platform role hierarchy for the admin panel. Client-safe (no node imports) so
 * both the server guards and the UI can reason about permissions consistently.
 */
export type Role = "USER" | "SUPPORT" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  SUPPORT: 1,
  MODERATOR: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export const ROLE_LABEL: Record<Role, string> = {
  USER: "User",
  SUPPORT: "Support",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

/** Any staff role (>= Support) may enter the admin panel. */
export function isStaff(role: string): boolean {
  return (ROLE_RANK[role as Role] ?? 0) >= ROLE_RANK.SUPPORT;
}

/** `role` is at least `min` in the hierarchy. */
export function hasAtLeast(role: string, min: Role): boolean {
  return (ROLE_RANK[role as Role] ?? 0) >= ROLE_RANK[min];
}
