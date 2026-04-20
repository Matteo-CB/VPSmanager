import { requireAdmin } from "@/lib/rbac";
import { createSession, hasPtySupport } from "@/lib/pty-sessions";
import { errorResponse, ok, ApiError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    if (!(await hasPtySupport())) {
      throw new ApiError("pty.unavailable", "PTY not available on this host (node-pty not installed)", 503);
    }
    const body = await req.json().catch(() => ({}));
    const id = await createSession(user.id, {
      cols: Number(body.cols) || 120,
      rows: Number(body.rows) || 30,
    });
    if (!id) throw new ApiError("pty.create_failed", "Failed to create PTY", 500);
    return ok({ id });
  } catch (e) { return errorResponse(e); }
}
