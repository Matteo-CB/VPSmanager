import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const zones = await prisma.dnsZone.findMany({
      include: { _count: { select: { records: true } } },
      orderBy: { domain: "asc" },
    });
    return ok({
      data: zones.map((z) => ({ id: z.id, domain: z.domain, provider: z.provider, records: z._count.records })),
    });
  } catch (e) { return errorResponse(e); }
}
