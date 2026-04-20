import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get("domain");
    if (domain) {
      const zone = await prisma.dnsZone.findUnique({
        where: { domain },
        include: { records: { orderBy: { type: "asc" } } },
      });
      return ok({ zone });
    }
    const zones = await prisma.dnsZone.findMany({ include: { _count: { select: { records: true } } } });
    return ok({ zones: zones.map((z) => ({ domain: z.domain, provider: z.provider, records: z._count.records })) });
  } catch (e) { return errorResponse(e); }
}
