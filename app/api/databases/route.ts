import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const dbs = await prisma.hostedDatabase.findMany({ orderBy: { createdAt: "asc" } });
    return ok({
      data: dbs.map((d) => ({
        id: d.id,
        name: d.name,
        engine: d.engine,
        version: d.version,
        size: `${d.sizeMb >= 1024 ? (d.sizeMb / 1024).toFixed(1) + " GB" : d.sizeMb + " MB"}`,
        connections: d.connections,
      })),
    });
  } catch (e) { return errorResponse(e); }
}
