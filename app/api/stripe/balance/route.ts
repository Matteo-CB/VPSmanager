import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const balance = await prisma.stripeBalance.findFirst({ orderBy: { syncedAt: "desc" } });
    return ok({ balance });
  } catch (e) { return errorResponse(e); }
}
