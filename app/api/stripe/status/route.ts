import { prisma } from "@/lib/prisma";
import { hasStripe } from "@/lib/env";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const [account, countP, countC, countPr, countS, successCount, uniqueBuyersRows] = await Promise.all([
      prisma.stripeAccount.findFirst(),
      prisma.stripePayment.count(),
      prisma.stripeCustomer.count(),
      prisma.stripeProduct.count(),
      prisma.stripeSubscription.count(),
      prisma.stripePayment.count({ where: { status: "succeeded" } }),
      prisma.stripePayment.findMany({
        where: { status: "succeeded", customerEmail: { not: null } },
        distinct: ["customerEmail"],
        select: { customerEmail: true },
      }),
    ]);
    return ok({
      configured: hasStripe,
      account: account ? {
        id: account.id, livemode: account.livemode,
        displayName: account.displayName, email: account.email,
        country: account.country, defaultCurrency: account.defaultCurrency,
        lastSyncAt: account.lastSyncAt,
      } : null,
      counts: {
        payments: countP,
        paymentsSucceeded: successCount,
        customers: countC,
        uniqueBuyers: uniqueBuyersRows.length,
        products: countPr,
        subscriptions: countS,
      },
    });
  } catch (e) { return errorResponse(e); }
}
