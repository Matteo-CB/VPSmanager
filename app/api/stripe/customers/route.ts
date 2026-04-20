import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const customers = await prisma.stripeCustomer.findMany({
      orderBy: { created: "desc" },
      take: 200,
    });
    return ok({
      data: customers.map((c) => ({
        id: c.id, email: c.email, name: c.name, created: c.created, balance: c.balance, currency: c.currency,
      })),
    });
  } catch (e) { return errorResponse(e); }
}
