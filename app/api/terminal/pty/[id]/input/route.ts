import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { writeTo } from "@/lib/pty-sessions";
import { errorResponse, ok, ApiError } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data = String(body.data ?? "");
    if (!writeTo(id, data)) throw new ApiError("pty.not_found", "session not found", 404);
    return ok({ ok: true });
  } catch (e) { return errorResponse(e); }
}
