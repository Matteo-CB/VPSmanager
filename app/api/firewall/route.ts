import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const rules = await prisma.firewallRule.findMany({ orderBy: { order: "asc" } });
    return ok({
      data: rules.map((r) => ({
        id: r.id, action: r.action, port: r.port, proto: r.protocol, src: r.source, c: r.comment ?? "",
      })),
    });
  } catch (e) { return errorResponse(e); }
}
