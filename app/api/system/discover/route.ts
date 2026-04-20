import { requireAdmin } from "@/lib/rbac";
import { discoverSystem } from "@/lib/discovery";
import { errorResponse, ok } from "@/lib/api";

export async function POST() {
  try {
    await requireAdmin();
    await discoverSystem();
    return ok({ done: true });
  } catch (e) { return errorResponse(e); }
}
