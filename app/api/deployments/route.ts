import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.toLowerCase();
    const deployments = await prisma.deployment.findMany({
      include: { site: { select: { slug: true, name: true } } },
      orderBy: { queuedAt: "desc" },
      take: 100,
    });
    const rows = deployments
      .map((d) => ({
        id: d.id,
        site: d.site.name,
        slug: d.site.slug,
        commit: d.commitSha.slice(0, 7),
        msg: d.commitMessage ?? "",
        author: d.commitAuthor ?? "·",
        branch: d.branch,
        target: d.target,
        status: d.status,
        duration: formatDuration(d.durationMs),
        when: relativeTime(d.queuedAt),
      }))
      .filter((r) => !q || (r.site + r.msg + r.commit).toLowerCase().includes(q));
    return ok({ data: rows });
  } catch (e) { return errorResponse(e); }
}

function formatDuration(ms: number | null): string {
  if (!ms) return "·";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "maintenant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}
