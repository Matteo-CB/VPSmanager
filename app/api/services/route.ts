import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const kind = req.nextUrl.searchParams.get("kind");
    const services = await prisma.managedService.findMany({
      where: kind && kind !== "all" ? { kind: kind as never } : undefined,
      orderBy: { displayName: "asc" },
    });
    return ok({
      data: services.map((s) => ({
        name: s.displayName,
        kind: s.kind.toLowerCase(),
        state: s.state,
        uptime: s.uptime,
        cpu: s.cpu,
        mem: s.memMb,
        site: s.siteSlug,
      })),
    });
  } catch (e) { return errorResponse(e); }
}
