import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const source = req.nextUrl.searchParams.get("source");
    const level = req.nextUrl.searchParams.get("level");
    const q = req.nextUrl.searchParams.get("q")?.toLowerCase();
    const siteSlug = req.nextUrl.searchParams.get("site");
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 200), 1000);

    const logs = await prisma.logEntry.findMany({
      where: {
        ...(source && source !== "all" ? { source } : {}),
        ...(level && level !== "all" ? { level } : {}),
        ...(siteSlug ? { siteSlug } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    const filtered = q ? logs.filter((l) => l.message.toLowerCase().includes(q)) : logs;

    return ok({
      data: filtered.reverse().map((l) => ({
        t: l.timestamp.toISOString().slice(11, 23),
        src: l.source,
        lvl: l.level,
        msg: l.message,
      })),
    });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = await prisma.logEntry.create({
      data: {
        source: body.source ?? "app",
        level: body.level ?? "info",
        message: body.message ?? "",
        siteSlug: body.siteSlug,
      },
    });
    return ok({ log: created }, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
