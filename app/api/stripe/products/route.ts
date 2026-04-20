import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const products = await prisma.stripeProduct.findMany({
      include: { prices: true },
      orderBy: { created: "desc" },
    });
    return ok({
      data: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        active: p.active,
        created: p.created,
        defaultPriceId: p.defaultPriceId,
        prices: p.prices.map((pr) => ({
          id: pr.id,
          unitAmount: pr.unitAmount,
          currency: pr.currency.toUpperCase(),
          type: pr.type,
          recurring: pr.recurring,
          active: pr.active,
        })),
      })),
    });
  } catch (e) { return errorResponse(e); }
}
