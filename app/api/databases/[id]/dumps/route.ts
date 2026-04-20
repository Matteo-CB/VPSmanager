import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const backups = await prisma.backup.findMany({
      where: { kind: "DATABASE", path: { contains: id } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return ok({
      data: backups.map((b) => ({
        id: b.id,
        t: b.createdAt.toISOString().slice(0, 19).replace("T", " "),
        size: `${(Number(b.sizeBytes) / 1024 / 1024).toFixed(1)} MB`,
        kind: b.target === "LOCAL" ? "Auto · local" : b.target,
        status: b.status,
      })),
    });
  } catch (e) { return errorResponse(e); }
}
