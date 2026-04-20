import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const payments = await prisma.stripePayment.findMany({
      where: { status: "succeeded", created: { gte: since } },
      select: { amount: true, amountCaptured: true, currency: true, created: true },
    });

    const buckets = new Map<string, { gross: number; net: number; count: number; currency: string }>();
    for (const p of payments) {
      const key = `${p.created.getUTCFullYear()}-${String(p.created.getUTCMonth() + 1).padStart(2, "0")}`;
      const cur = buckets.get(key) ?? { gross: 0, net: 0, count: 0, currency: p.currency };
      cur.gross += p.amount;
      cur.net += p.amountCaptured;
      cur.count++;
      buckets.set(key, cur);
    }

    const months: { month: string; gross: number; net: number; count: number; currency: string }[] = [];
    const cursor = new Date(since);
    const now = new Date();
    while (cursor <= now) {
      const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
      const b = buckets.get(key) ?? { gross: 0, net: 0, count: 0, currency: "usd" };
      months.push({ month: key, ...b });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const totalGross = months.reduce((s, m) => s + m.gross, 0);
    const totalCount = months.reduce((s, m) => s + m.count, 0);

    const topCurrency = [...buckets.values()].reduce<Record<string, number>>((acc, b) => {
      acc[b.currency] = (acc[b.currency] ?? 0) + b.gross;
      return acc;
    }, {});
    const mainCurrency = Object.entries(topCurrency).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "usd";

    return ok({ months, totalGross, totalCount, currency: mainCurrency.toUpperCase() });
  } catch (e) { return errorResponse(e); }
}
