import Stripe from "stripe";
import { env, hasStripe } from "./env";
import { prisma } from "./prisma";

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!hasStripe) return null;
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2 });
  }
  return client;
}

export async function syncStripe(): Promise<{
  account: boolean;
  balance: boolean;
  customers: number;
  products: number;
  payments: number;
  subscriptions: number;
}> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe API key not configured");

  const stats = { account: false, balance: false, customers: 0, products: 0, payments: 0, subscriptions: 0 };

  try {

    const acc = await (stripe.accounts as unknown as { retrieve: () => Promise<Stripe.Account> }).retrieve();
    await prisma.stripeAccount.upsert({
      where: { id: acc.id },
      update: {
        livemode: !!acc.charges_enabled && !acc.id.startsWith("acct_test"),
        displayName: acc.settings?.dashboard?.display_name ?? acc.business_profile?.name ?? null,
        email: acc.email ?? null,
        country: acc.country ?? null,
        defaultCurrency: acc.default_currency ?? null,
        lastSyncAt: new Date(),
      },
      create: {
        id: acc.id,
        livemode: !acc.id.startsWith("acct_test"),
        displayName: acc.settings?.dashboard?.display_name ?? acc.business_profile?.name ?? null,
        email: acc.email ?? null,
        country: acc.country ?? null,
        defaultCurrency: acc.default_currency ?? null,
        lastSyncAt: new Date(),
      },
    });
    stats.account = true;
  } catch (e) {
    console.warn("[stripe.sync] account:", (e as Error).message);
  }

  try {
    const bal = await stripe.balance.retrieve();
    await prisma.stripeBalance.deleteMany();
    await prisma.stripeBalance.create({
      data: {
        available: bal.available as never,
        pending: bal.pending as never,
        currency: bal.available[0]?.currency ?? "usd",
        syncedAt: new Date(),
      },
    });
    stats.balance = true;
  } catch (e) {
    console.warn("[stripe.sync] balance:", (e as Error).message);
  }

  try {
    for await (const c of stripe.customers.list({ limit: 100 })) {
      await prisma.stripeCustomer.upsert({
        where: { id: c.id },
        update: {
          email: c.email ?? null,
          name: c.name ?? null,
          balance: c.balance ?? 0,
          currency: c.currency ?? null,
          metadata: (c.metadata as never) ?? {},
          syncedAt: new Date(),
        },
        create: {
          id: c.id,
          email: c.email ?? null,
          name: c.name ?? null,
          created: new Date(c.created * 1000),
          balance: c.balance ?? 0,
          currency: c.currency ?? null,
          metadata: (c.metadata as never) ?? {},
        },
      });
      stats.customers++;
    }
  } catch (e) {
    console.warn("[stripe.sync] customers:", (e as Error).message);
  }

  try {
    for await (const p of stripe.products.list({ limit: 100 })) {
      await prisma.stripeProduct.upsert({
        where: { id: p.id },
        update: {
          name: p.name, description: p.description ?? null, active: p.active,
          defaultPriceId: typeof p.default_price === "string" ? p.default_price : (p.default_price?.id ?? null),
          metadata: (p.metadata as never) ?? {},
          syncedAt: new Date(),
        },
        create: {
          id: p.id, name: p.name, description: p.description ?? null, active: p.active,
          created: new Date(p.created * 1000),
          defaultPriceId: typeof p.default_price === "string" ? p.default_price : (p.default_price?.id ?? null),
          metadata: (p.metadata as never) ?? {},
        },
      });
      stats.products++;
    }
    for await (const pr of stripe.prices.list({ limit: 100 })) {
      const productId = typeof pr.product === "string" ? pr.product : pr.product.id;
      await prisma.stripePrice.upsert({
        where: { id: pr.id },
        update: {
          productId, currency: pr.currency, unitAmount: pr.unit_amount ?? 0,
          type: pr.type, recurring: (pr.recurring as never) ?? null, active: pr.active,
          syncedAt: new Date(),
        },
        create: {
          id: pr.id, productId, currency: pr.currency, unitAmount: pr.unit_amount ?? 0,
          type: pr.type, recurring: (pr.recurring as never) ?? null, active: pr.active,
        },
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("[stripe.sync] products:", (e as Error).message);
  }

  try {
    for await (const ch of stripe.charges.list({ limit: 100 })) {
      await prisma.stripePayment.upsert({
        where: { id: ch.id },
        update: {
          amount: ch.amount, amountCaptured: ch.amount_captured ?? ch.amount,
          currency: ch.currency, status: ch.status,
          description: ch.description ?? null,
          customerId: typeof ch.customer === "string" ? ch.customer : (ch.customer?.id ?? null),
          customerEmail: ch.billing_details?.email ?? null,
          paymentMethod: ch.payment_method_details?.type ?? null,
          receiptUrl: ch.receipt_url ?? null,
          metadata: (ch.metadata as never) ?? {},
          syncedAt: new Date(),
        },
        create: {
          id: ch.id, amount: ch.amount, amountCaptured: ch.amount_captured ?? ch.amount,
          currency: ch.currency, status: ch.status,
          description: ch.description ?? null,
          customerId: typeof ch.customer === "string" ? ch.customer : (ch.customer?.id ?? null),
          customerEmail: ch.billing_details?.email ?? null,
          paymentMethod: ch.payment_method_details?.type ?? null,
          created: new Date(ch.created * 1000),
          receiptUrl: ch.receipt_url ?? null,
          metadata: (ch.metadata as never) ?? {},
        },
      });
      stats.payments++;
    }
  } catch (e) {
    console.warn("[stripe.sync] payments:", (e as Error).message);
  }

  try {
    for await (const s of stripe.subscriptions.list({ limit: 100, status: "all" })) {

      const subAny = s as unknown as { current_period_start?: number; current_period_end?: number };
      const firstItem = s.items.data[0] as unknown as { current_period_start?: number; current_period_end?: number };
      const startUnix = subAny.current_period_start ?? firstItem?.current_period_start ?? s.created;
      const endUnix = subAny.current_period_end ?? firstItem?.current_period_end ?? s.created;

      await prisma.stripeSubscription.upsert({
        where: { id: s.id },
        update: {
          customerId: typeof s.customer === "string" ? s.customer : s.customer.id,
          status: s.status,
          currentPeriodStart: new Date(startUnix * 1000),
          currentPeriodEnd: new Date(endUnix * 1000),
          items: s.items.data.map((it) => ({ priceId: it.price.id, quantity: it.quantity })) as never,
          canceledAt: s.canceled_at ? new Date(s.canceled_at * 1000) : null,
          metadata: (s.metadata as never) ?? {},
          syncedAt: new Date(),
        },
        create: {
          id: s.id,
          customerId: typeof s.customer === "string" ? s.customer : s.customer.id,
          status: s.status,
          currentPeriodStart: new Date(startUnix * 1000),
          currentPeriodEnd: new Date(endUnix * 1000),
          items: s.items.data.map((it) => ({ priceId: it.price.id, quantity: it.quantity })) as never,
          created: new Date(s.created * 1000),
          canceledAt: s.canceled_at ? new Date(s.canceled_at * 1000) : null,
          metadata: (s.metadata as never) ?? {},
        },
      });
      stats.subscriptions++;
    }
  } catch (e) {
    console.warn("[stripe.sync] subs:", (e as Error).message);
  }

  return stats;
}
