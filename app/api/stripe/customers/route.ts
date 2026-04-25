import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";
import { isAdmin } from "@/lib/rbac";

export async function GET() {
  try {
    const admin = await isAdmin();
    const customers = await prisma.stripeCustomer.findMany({
      orderBy: { created: "desc" },
      take: 200,
    });
    return ok({
      data: customers.map((c) => ({
        id: c.id,
        email: admin ? c.email : "***@***",
        name: admin ? c.name : "***",
        created: c.created,
        balance: c.balance,
        currency: c.currency,
      })),
    });
  } catch (e) { return errorResponse(e); }
}
