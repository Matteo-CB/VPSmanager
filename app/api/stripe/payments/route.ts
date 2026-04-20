import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);
    const status = req.nextUrl.searchParams.get("status");
    const payments = await prisma.stripePayment.findMany({
      where: status ? { status } : undefined,
      orderBy: { created: "desc" },
      take: limit,
    });
    return ok({
      data: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        amountCaptured: p.amountCaptured,
        currency: p.currency.toUpperCase(),
        status: p.status,
        description: p.description,
        customerId: p.customerId,
        customerEmail: p.customerEmail,
        paymentMethod: p.paymentMethod,
        created: p.created,
        receiptUrl: p.receiptUrl,
      })),
    });
  } catch (e) { return errorResponse(e); }
}
