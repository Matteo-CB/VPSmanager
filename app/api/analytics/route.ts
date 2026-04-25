import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";
import { requireUser } from "@/lib/rbac";

export async function GET() {
  try {
    await requireUser();

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const since30d = new Date(now.getTime() - 30 * 86400_000);
    const since14d = new Date(now.getTime() - 13 * 86400_000);
    since14d.setUTCHours(0, 0, 0, 0);
    const since24h = new Date(now.getTime() - 24 * 3600_000);

    const [
      totalDeploys,
      sites,
      deploys30d,
      deploys14d,
      services,
      domains,
      logsBySource,
    ] = await Promise.all([
      prisma.deployment.count(),
      prisma.site.findMany({ select: { id: true, slug: true, name: true, status: true, domainPrimary: true } }),
      prisma.deployment.findMany({
        where: { queuedAt: { gte: since30d } },
        select: { siteId: true, status: true, durationMs: true, queuedAt: true },
      }),
      prisma.deployment.findMany({
        where: { queuedAt: { gte: since14d } },
        select: { status: true, queuedAt: true },
      }),
      prisma.managedService.findMany({ select: { state: true } }),
      prisma.domain.findMany({
        where: { certExpiresAt: { not: null } },
        select: { hostname: true, certExpiresAt: true, certStatus: true },
      }),
      prisma.logEntry.groupBy({
        by: ["source"],
        where: { timestamp: { gte: since24h } },
        _count: { _all: true },
      }),
    ]);

    const ready30d = deploys30d.filter((d) => d.status === "READY").length;
    const failed30d = deploys30d.filter((d) => d.status === "ERROR").length;
    const finished30d = ready30d + failed30d;
    const successRate = finished30d > 0 ? ready30d / finished30d : null;
    const durations = deploys30d.filter((d) => d.status === "READY" && d.durationMs).map((d) => d.durationMs!);
    const avgDurationMs = durations.length > 0 ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length) : null;

    const days: { date: string; ready: number; failed: number; other: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(startOfDay.getTime() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, ready: 0, failed: 0, other: 0 });
    }
    for (const d of deploys14d) {
      const key = d.queuedAt.toISOString().slice(0, 10);
      const day = days.find((x) => x.date === key);
      if (!day) continue;
      if (d.status === "READY") day.ready++;
      else if (d.status === "ERROR") day.failed++;
      else day.other++;
    }

    const counts = new Map<string, number>();
    const lastAt = new Map<string, Date>();
    for (const d of deploys30d) {
      counts.set(d.siteId, (counts.get(d.siteId) ?? 0) + 1);
      const prev = lastAt.get(d.siteId);
      if (!prev || d.queuedAt > prev) lastAt.set(d.siteId, d.queuedAt);
    }
    const topSites = sites
      .map((s) => ({
        slug: s.slug,
        name: s.name,
        domain: s.domainPrimary,
        count: counts.get(s.id) ?? 0,
        lastAt: lastAt.get(s.id)?.toISOString() ?? null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const svcRunning = services.filter((s) => s.state === "running").length;
    const svcFailed = services.filter((s) => s.state === "failed").length;
    const svcStopped = services.length - svcRunning - svcFailed;

    const sslExpiring = domains
      .filter((d) => d.certExpiresAt)
      .map((d) => {
        const daysLeft = Math.floor((d.certExpiresAt!.getTime() - now.getTime()) / 86400_000);
        return { hostname: d.hostname, expiresAt: d.certExpiresAt!.toISOString(), daysLeft, status: d.certStatus };
      })
      .filter((d) => d.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return ok({
      overall: {
        totalDeploys,
        deploys30d: deploys30d.length,
        ready30d,
        failed30d,
        successRate,
        avgDurationMs,
        activeSites: sites.filter((s) => s.status === "ACTIVE").length,
        totalSites: sites.length,
      },
      deploysPerDay: days,
      topSites,
      services: { running: svcRunning, failed: svcFailed, stopped: svcStopped, total: services.length },
      sslExpiringSoon: sslExpiring,
      logsBySource24h: logsBySource
        .map((l) => ({ source: l.source, count: l._count._all }))
        .sort((a, b) => b.count - a.count),
    });
  } catch (e) { return errorResponse(e); }
}
