import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { resize } from "@/lib/pty-sessions";
import { errorResponse, ok, ApiError } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const cols = Number(body.cols);
    const rows = Number(body.rows);
    if (!cols || !rows) throw new ApiError("pty.invalid", "cols and rows required", 400);
    if (!resize(id, cols, rows)) throw new ApiError("pty.not_found", "session not found", 404);
    return ok({ ok: true });
  } catch (e) { return errorResponse(e); }
}
