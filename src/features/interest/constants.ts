/** Shared interest / interest-request constants (client + server safe). */

/** Points awarded to a requester when their suggested interest is published. */
export const INTEREST_REWARD_POINTS = 50;

/** Field limits for a "Suggest a New Interest" request. Enforced client + server. */
export const SUGGEST_LIMITS = {
  name: { min: 2, max: 50 },
  description: { min: 10, max: 280 },
  reason: { min: 10, max: 500 },
} as const;

export const INTEREST_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED", "MERGED"] as const;
export type InterestRequestStatus = (typeof INTEREST_REQUEST_STATUSES)[number];
