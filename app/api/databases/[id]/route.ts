import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await prisma.hostedDatabase.findUnique({ where: { id } });
    if (!db) throw new ApiError("db.not_found", "Database not found", 404);
    return ok({
      database: {
        id: db.id, name: db.name, engine: db.engine, version: db.version,
        host: db.host, port: db.port, size: `${db.sizeMb >= 1024 ? (db.sizeMb / 1024).toFixed(1) + " GB" : db.sizeMb + " MB"}`,
        connections: db.connections, lastBackupAt: db.lastBackupAt,
      },
    });
  } catch (e) { return errorResponse(e); }
}
