import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const dep = await prisma.deployment.findUnique({
      where: { id },
      include: { site: true, logs: { orderBy: { seq: "asc" } } },
    });
    if (!dep) throw new ApiError("deployment.not_found", "Deployment not found", 404);
    return ok({ deployment: dep });
  } catch (e) { return errorResponse(e); }
}
