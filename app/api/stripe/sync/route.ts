import { requireAdmin } from "@/lib/rbac";
import { syncStripe } from "@/lib/stripe";
import { errorResponse, ok, ApiError } from "@/lib/api";
import { hasStripe } from "@/lib/env";

export async function POST() {
  try {
    await requireAdmin();
    if (!hasStripe) throw new ApiError("stripe.not_configured", "STRIPE_SECRET_KEY not set", 400);
    const stats = await syncStripe();
    return ok({ stats });
  } catch (e) { return errorResponse(e); }
}
