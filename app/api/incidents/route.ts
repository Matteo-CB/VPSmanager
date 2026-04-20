import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const incidents = await prisma.incident.findMany({ orderBy: { openedAt: "desc" }, take: 20 });
    return ok({
      data: incidents.map((i) => ({
        id: i.id, sev: i.severity, msg: i.message, open: i.open,
        when: relative(i.openedAt),
      })),
    });
  } catch (e) { return errorResponse(e); }
}

function relative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "maintenant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}
