import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const site = await prisma.site.findUnique({
      where: { slug },
      include: { domains: true, deployments: { orderBy: { queuedAt: "desc" }, take: 20 }, envGroups: { include: { variables: true } } },
    });
    if (!site) throw new ApiError("site.not_found", "Site not found", 404);
    return ok({ site });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await prisma.site.delete({ where: { slug } });
    return ok({ deleted: true });
  } catch (e) { return errorResponse(e); }
}
