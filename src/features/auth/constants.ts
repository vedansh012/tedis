/**
 * Auth constants safe to import from BOTH client and server. No node built-ins,
 * no env access — so importing these into a client bundle stays clean.
 */
export const CSRF_COOKIE = "tedis_csrf";
export const CSRF_HEADER = "x-csrf-token";
export const SESSION_COOKIE = "tedis_session";
