import { isProd } from "@/config/env";

/**
 * Minimal structured logger. JSON lines in production (parseable by any log
 * drain — Railway/Render/Datadog/Loki), pretty in dev. No dependency, no
 * main-thread cost beyond a console write. Never throws.
 */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

function emit(level: Level, msg: string, fields?: Fields) {
  try {
    if (isProd) {
      const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...fields });
      (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
    } else {
      const tag = { debug: "·", info: "ℹ", warn: "⚠", error: "✖" }[level];
      (level === "error" ? console.error : console.log)(`${tag} ${msg}`, fields ?? "");
    }
  } catch {
    /* logging must never break the request */
  }
}

export const logger = {
  debug: (msg: string, fields?: Fields) => emit("debug", msg, fields),
  info: (msg: string, fields?: Fields) => emit("info", msg, fields),
  warn: (msg: string, fields?: Fields) => emit("warn", msg, fields),
  error: (msg: string, fields?: Fields) => emit("error", msg, fields),
};
