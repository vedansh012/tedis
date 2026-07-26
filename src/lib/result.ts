/**
 * A tiny typed Result for service-layer outcomes that are *expected* failures
 * (bad password, rate limited) as opposed to thrown exceptions (bugs, DB down).
 * Services return these; tRPC routers translate them into TRPCError codes.
 */
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = string> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
