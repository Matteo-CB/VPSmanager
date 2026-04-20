import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { killSession } from "@/lib/pty-sessions";
import { errorResponse, ok } from "@/lib/api";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    killSession(id);
    return ok({ killed: true });
  } catch (e) { return errorResponse(e); }
}
