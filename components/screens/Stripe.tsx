"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Card, Button, StatCard, Table, StatusDot, LineChart, EmptyState } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { apiGet, apiPost } from "@/lib/client-api";

type StatusResp = {
  configured: boolean;
  account: null | { id: string; livemode: boolean; displayName: string | null; email: string | null; country: string | null; defaultCurrency: string | null; lastSyncAt: string | null };
  counts: { payments: number; paymentsSucceeded: number; customers: number; uniqueBuyers: number; products: number; subscriptions: number };
};
type RevenueResp = { months: { month: string; gross: number; net: number; count: number; currency: string }[]; totalGross: number; totalCount: number; currency: string };
type PaymentRow = { id: string; amount: number; amountCaptured: number; currency: string; status: string; description: string | null; customerId: string | null; customerEmail: string | null; paymentMethod: string | null; created: string; receiptUrl: string | null };
type ProductRow = { id: string; name: string; description: string | null; active: boolean; prices: { id: string; unitAmount: number; currency: string; type: string; recurring: { interval?: string } | null; active: boolean }[] };
type CustomerRow = { id: string; email: string | null; name: string | null; created: string };
type BalanceResp = { balance: null | { available: { amount: number; currency: string }[]; pending: { amount: number; currency: string }[]; currency: string; syncedAt: string } };

function fmtAmount(minor: number, currency: string): string {
  const value = minor / 100;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}
function fmtDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function StripeScreen() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["stripe", "status"], queryFn: () => apiGet<StatusResp>("/api/stripe/status"), refetchInterval: 30000 });
  const revenue = useQuery({ queryKey: ["stripe", "revenue"], queryFn: () => apiGet<RevenueResp>("/api/stripe/revenue"), enabled: !!status.data?.configured });
  const payments = useQuery({ queryKey: ["stripe", "payments"], queryFn: () => apiGet<{ data: PaymentRow[] }>("/api/stripe/payments"), enabled: !!status.data?.configured });
  const products = useQuery({ queryKey: ["stripe", "products"], queryFn: () => apiGet<{ data: ProductRow[] }>("/api/stripe/products"), enabled: !!status.data?.configured });
  const customers = useQuery({ queryKey: ["stripe", "customers"], queryFn: () => apiGet<{ data: CustomerRow[] }>("/api/stripe/customers"), enabled: !!status.data?.configured });
  const balance = useQuery({ queryKey: ["stripe", "balance"], queryFn: () => apiGet<BalanceResp>("/api/stripe/balance"), enabled: !!status.data?.configured });

  const sync = useMutation({
    mutationFn: () => apiPost("/api/stripe/sync", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stripe"] });
    },
  });

  if (!status.data) {
    return <div style={{ padding: 28, color: "var(--text-3)" }}>Chargement…</div>;
  }

  if (!status.data.configured) {
    return (
      <div>
        <PageHeader title="Stripe" sub="Revenus, paiements et produits"/>
        <div style={{ padding: "48px 28px" }}>
          <EmptyState
            title="Stripe n'est pas connecté"
            hint={<>Ajoute <code style={{ fontFamily: "var(--mono)" }}>STRIPE_SECRET_KEY</code> dans <code style={{ fontFamily: "var(--mono)" }}>.env.local</code> (dashboard.stripe.com/apikeys) puis redémarre le service.</>}
          />
        </div>
      </div>
    );
  }

  const acc = status.data.account;
  const cur = acc?.defaultCurrency?.toUpperCase() ?? revenue.data?.currency ?? "EUR";
  const available = balance.data?.balance?.available ?? [];
  const pending = balance.data?.balance?.pending ?? [];

  return (
    <div>
      <PageHeader
        eyebrow={acc ? `${acc.displayName ?? acc.id} · ${acc.livemode ? "live" : "test"} · ${acc.country ?? ""}` : "Stripe"}
        title="Stripe"
        sub={acc?.lastSyncAt ? `Dernière synchro ${fmtDate(acc.lastSyncAt)}` : "Jamais synchronisé"}
        actions={<>
          <Button size="sm" variant="ghost" icon="refresh" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? "Synchro…" : "Synchroniser"}
          </Button>
        </>}
      />

      <div style={{ padding: "24px 28px 96px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard
            label="Revenus 12 mois"
            value={revenue.data ? fmtAmount(revenue.data.totalGross, revenue.data.currency) : "—"}
            sub={revenue.data ? `${revenue.data.totalCount} paiements` : ""}
            color="var(--text)"
            series={revenue.data?.months.map(m => m.gross / 100)}
          />
          <StatCard
            label="Solde disponible"
            value={available[0] ? fmtAmount(available[0].amount, available[0].currency.toUpperCase()) : "—"}
            sub={available.slice(1).map(a => fmtAmount(a.amount, a.currency.toUpperCase())).join(" · ")}
            color="var(--text)"
          />
          <StatCard
            label="En attente"
            value={pending[0] ? fmtAmount(pending[0].amount, pending[0].currency.toUpperCase()) : fmtAmount(0, cur)}
            sub="avant versement"
            color="var(--text-2)"
          />
          <StatCard
            label="Acheteurs uniques"
            value={String(status.data.counts.uniqueBuyers || status.data.counts.customers)}
            sub={`${status.data.counts.paymentsSucceeded} paiements réussis · ${status.data.counts.products} produits`}
            color="var(--text)"
          />
        </div>

        <Card title="Revenus par mois" subtitle={revenue.data ? `12 derniers mois · ${revenue.data.currency}` : "chargement"} pad={false}>
          <div style={{ padding: 20 }}>
            {revenue.data && revenue.data.months.length > 0 ? <>
              <LineChart data={revenue.data.months.map(m => m.gross / 100)} height={220} color="var(--accent)"/>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-4)" }}>
                {revenue.data.months.map(m => <span key={m.month}>{m.month}</span>)}
              </div>
            </> : <div style={{ color: "var(--text-3)", padding: 20, textAlign: "center" }}>Aucun paiement sur les 12 derniers mois.</div>}
          </div>
        </Card>

        <Card title="Paiements récents" subtitle={payments.data ? `${payments.data.data.length} derniers paiements` : "chargement"} pad={false}>
          <Table<PaymentRow>
            columns={[
              { label: "Status", width: 110, render: r => <StatusDot status={r.status === "succeeded" ? "READY" : r.status === "failed" ? "ERROR" : "info"} label={r.status}/> },
              { label: "Montant", width: 130, align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500 }}>{fmtAmount(r.amountCaptured ?? r.amount, r.currency)}</span> },
              { label: "Client", render: r => <span style={{ fontSize: 12 }}>{r.customerEmail ?? r.customerId ?? ""}</span> },
              { label: "Description", render: r => <span style={{ fontSize: 12, color: "var(--text-2)" }}>{r.description ?? ""}</span> },
              { label: "Méthode", width: 100, render: r => <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{r.paymentMethod ?? ""}</span> },
              { label: "Date", width: 140, align: "right", render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{fmtDate(r.created)}</span> },
              { label: "", width: 50, render: r => r.receiptUrl ? <a href={r.receiptUrl} target="_blank" rel="noreferrer"><Icon name="external" size={14} style={{ color: "var(--text-3)" }}/></a> : null },
            ]}
            rows={payments.data?.data ?? []}
          />
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
          <Card title="Produits" subtitle={products.data ? `${products.data.data.length} produits` : ""} pad={false}>
            <Table<ProductRow>
              columns={[
                { label: "Nom", render: r => <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)" }}>{r.description ?? r.id}</div>
                </div> },
                { label: "Prix", render: r => <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {r.prices.length === 0 && <span style={{ fontSize: 11, color: "var(--text-4)" }}>aucun prix</span>}
                  {r.prices.slice(0, 3).map(p => (
                    <span key={p.id} style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>
                      {fmtAmount(p.unitAmount, p.currency)}{p.recurring?.interval ? ` / ${p.recurring.interval}` : ""}
                    </span>
                  ))}
                </div> },
                { label: "", width: 90, render: r => <StatusDot status={r.active ? "READY" : "stopped"} label={r.active ? "Actif" : "Inactif"}/> },
              ]}
              rows={products.data?.data ?? []}
            />
          </Card>
          <Card title="Clients récents" subtitle={customers.data ? `${customers.data.data.length} clients` : ""} pad={false}>
            <Table<CustomerRow>
              columns={[
                { label: "Email / Nom", render: r => <div>
                  <div style={{ fontSize: 13 }}>{r.email ?? r.name ?? r.id}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{r.id}</div>
                </div> },
                { label: "Créé", width: 130, align: "right", render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{fmtDate(r.created)}</span> },
              ]}
              rows={customers.data?.data ?? []}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
