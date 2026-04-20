import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { subscribe, getSession } from "@/lib/pty-sessions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!getSession(id)) return new Response("session not found", { status: 404 });

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (data: string) => {
        const lines = data.split("\n").map((l) => `data: ${l}`).join("\n");
        controller.enqueue(enc.encode(`event: data\n${lines}\n\n`));
      };

      const unsubscribe = subscribe(id, send);
      if (!unsubscribe) {
        controller.close();
        return;
      }

      const ping = setInterval(() => {
        try { controller.enqueue(enc.encode(`: ping\n\n`)); } catch { clearInterval(ping); }
      }, 20000);

      const cleanup = () => { clearInterval(ping); unsubscribe(); };

      const sig = (controller as unknown as { signal?: AbortSignal }).signal;
      if (sig) sig.addEventListener("abort", cleanup);

    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
