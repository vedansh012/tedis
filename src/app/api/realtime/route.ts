import { getServerAuth } from "@/server/auth/current-user";
import { redis } from "@/server/db/redis";
import { userChannel, markOnline, markOffline } from "@/server/services/messaging/realtime";
import { broadcastPresence } from "@/server/services/messaging/messaging.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for realtime chat. The client opens one EventSource;
 * we subscribe a dedicated Redis connection to that user's channel and forward
 * every published event. A 15s heartbeat keeps the connection alive and refreshes
 * the presence TTL. Everything is torn down on disconnect (req.signal abort).
 *
 * Note: one Redis subscriber connection per SSE client — fine to low thousands
 * of concurrent connections per instance; multiplex or move to a realtime tier
 * beyond that.
 */
export async function GET(req: Request) {
  const auth = await getServerAuth();
  if (!auth) return new Response("Unauthorized", { status: 401 });
  const me = auth.user.id;

  const sub = redis.duplicate();
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let cleanup = async () => {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* controller already closed */
        }
      };
      const send = (data: string) => write(`data: ${data}\n\n`);

      cleanup = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        try {
          await sub.unsubscribe();
        } catch {
          /* noop */
        }
        try {
          sub.disconnect();
        } catch {
          /* noop */
        }
        await markOffline(me).catch(() => {});
        await broadcastPresence(me, false).catch(() => {});
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      // Forward every Redis message on this user's channel to the client.
      sub.on("message", (_channel, payload) => send(payload));
      await sub.subscribe(userChannel(me));

      await markOnline(me);
      await broadcastPresence(me, true).catch(() => {});
      send(JSON.stringify({ t: "ready" }));

      // Keepalive comment every 25s is free (just a stream write); refresh the
      // Redis presence key only every ~45s (roughly half its 90s TTL) so we
      // don't hammer a free Redis tier with a write every 15s per online user.
      let tick = 0;
      heartbeat = setInterval(() => {
        write(`: ping\n\n`);
        if (++tick % 2 === 0) void markOnline(me); // ~every 50s
      }, 25_000);

      // Client navigated away / closed the tab.
      req.signal.addEventListener("abort", () => void cleanup());
    },
    cancel() {
      void cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // don't let nginx buffer the stream
    },
  });
}
