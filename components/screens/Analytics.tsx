"use client";
import React from "react";
import { PageHeader, Card, StatCard, Table, StatusDot, Button } from "../ui/primitives";
import { useAnalytics, AnalyticsResp } from "@/lib/hooks";
import type { Go } from "@/lib/route";

function formatDuration(ms: number | null): string {
  if (!ms) return "·";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m === 0 ? `${s}s` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

function relative(d: string | null): string {
  if (!d) return "·";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export function AnalyticsScreen({ go }: { go: Go }) {
  const q = useAnalytics();
  const data = q.data;

  return (
    <div>
      <PageHeader
        eyebrow="Aperçu de l'activité plateforme"
        title="Analytics"
        sub="Déploiements, services et certificats sur 30 jours"
        actions={<Button size="sm" variant="ghost" icon="refresh" onClick={() => q.refetch()}>Rafraîchir</Button>}
      />

      <div style={{ padding: "24px 28px 96px", display: "flex", flexDirection: "column", gap: 24 }}>
        <StatsRow data={data}/>
        <DeploysChart data={data}/>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
          <TopSitesCard data={data} go={go}/>
          <ServicesCard data={data}/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <SslCard data={data}/>
          <LogsBySourceCard data={data}/>
        </div>
      </div>
    </div>
  );
}

function StatsRow({ data }: { data?: AnalyticsResp }) {
  const o = data?.overall;
  const successPct = o?.successRate != null ? `${(o.successRate * 100).toFixed(0)}%` : "·";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      <StatCard
        label="Déploiements (30j)"
        value={o ? String(o.deploys30d) : "…"}
        sub={o ? `${o.totalDeploys} au total` : ""}
      />
      <StatCard
        label="Taux de succès (30j)"
        value={successPct}
        sub={o ? `${o.ready30d} ready · ${o.failed30d} errors` : ""}
        color={o?.successRate != null && o.successRate < 0.7 ? "var(--warn)" : "var(--text)"}
      />
      <StatCard
        label="Durée moyenne"
        value={o?.avgDurationMs != null ? formatDuration(o.avgDurationMs) : "·"}
        sub="builds réussis (30j)"
      />
      <StatCard
        label="Sites actifs"
        value={o ? String(o.activeSites) : "…"}
        sub={o ? `${o.totalSites} sites configurés` : ""}
      />
    </div>
  );
}

function DeploysChart({ data }: { data?: AnalyticsResp }) {
  const days = data?.deploysPerDay ?? [];
  const max = Math.max(1, ...days.map((d) => d.ready + d.failed + d.other));
  return (
    <Card title="Déploiements par jour" subtitle="14 derniers jours · ready / errors / autres" pad={false}>
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${days.length || 14}, 1fr)`, gap: 6, alignItems: "end", height: 200 }}>
          {days.map((d) => {
            const total = d.ready + d.failed + d.other;
            const h = (total / max) * 180;
            return (
              <div key={d.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }} title={`${d.date} · ${d.ready} ready · ${d.failed} errors · ${d.other} autres`}>
                <div style={{ height: h || 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", borderRadius: 2, overflow: "hidden", background: total === 0 ? "var(--surface-2)" : "transparent" }}>
                  {d.failed > 0 && <div style={{ height: `${(d.failed / total) * 100}%`, background: "var(--err)" }}/>}
                  {d.other > 0 && <div style={{ height: `${(d.other / total) * 100}%`, background: "var(--text-3)" }}/>}
                  {d.ready > 0 && <div style={{ height: `${(d.ready / total) * 100}%`, background: "var(--ok)" }}/>}
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--text-4)", whiteSpace: "nowrap" }}>{d.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 18, fontSize: 11, color: "var(--text-3)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ok)" }}/>Ready</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--err)" }}/>Errors</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--text-3)" }}/>Autres</span>
        </div>
      </div>
    </Card>
  );
}

type SiteRow = AnalyticsResp["topSites"][number];

function TopSitesCard({ data, go }: { data?: AnalyticsResp; go: Go }) {
  const rows = data?.topSites ?? [];
  return (
    <Card title="Sites les plus actifs" subtitle="Déploiements sur 30 jours" pad={false}>
      <Table<SiteRow>
        onRowClick={(r) => go("site", r.slug)}
        columns={[
          { label: "Site", render: (r) => (
            <div>
              <div style={{ fontWeight: 500 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{r.domain ?? "·"}</div>
            </div>
          )},
          { label: "Déploiements", width: 130, align: "right", render: (r) => <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: r.count > 0 ? "var(--text)" : "var(--text-4)" }}>{r.count}</span> },
          { label: "Dernier", width: 140, align: "right", render: (r) => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{relative(r.lastAt)}</span> },
        ]}
        rows={rows}
      />
    </Card>
  );
}

function ServicesCard({ data }: { data?: AnalyticsResp }) {
  const s = data?.services;
  const total = s?.total ?? 0;
  const pct = (n: number) => total === 0 ? 0 : (n / total) * 100;
  return (
    <Card title="État des services" subtitle="systemd · docker · pm2" pad={false}>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        {s ? <>
          <div style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", background: "var(--surface-2)" }}>
            {s.running > 0 && <div style={{ width: `${pct(s.running)}%`, background: "var(--ok)" }} title={`${s.running} running`}/>}
            {s.failed > 0 && <div style={{ width: `${pct(s.failed)}%`, background: "var(--err)" }} title={`${s.failed} failed`}/>}
            {s.stopped > 0 && <div style={{ width: `${pct(s.stopped)}%`, background: "var(--text-3)" }} title={`${s.stopped} stopped`}/>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Stat label="Running" value={s.running} color="var(--ok)"/>
            <Stat label="Failed"  value={s.failed}  color="var(--err)"/>
            <Stat label="Stopped" value={s.stopped} color="var(--text-3)"/>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", paddingTop: 12, borderTop: "1px solid var(--line)" }}>{total} services suivis au total</div>
        </> : <div style={{ color: "var(--text-3)", fontSize: 12 }}>Chargement…</div>}
      </div>
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 26, color }}>{value}</div>
      <div style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</div>
    </div>
  );
}

type SslRow = AnalyticsResp["sslExpiringSoon"][number];

function SslCard({ data }: { data?: AnalyticsResp }) {
  const rows = data?.sslExpiringSoon ?? [];
  return (
    <Card title="Certificats TLS à surveiller" subtitle="Expiration sous 30 jours" pad={false}>
      {rows.length === 0
        ? <div style={{ padding: 20, color: "var(--text-3)", fontSize: 12 }}>Aucun certificat n'expire dans les 30 prochains jours.</div>
        : <Table<SslRow>
            columns={[
              { label: "Domaine", render: (r) => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.hostname}</span> },
              { label: "Expire dans", width: 130, align: "right", render: (r) => <span style={{ fontSize: 12, color: r.daysLeft < 7 ? "var(--err)" : r.daysLeft < 14 ? "var(--warn)" : "var(--text-2)" }}>{r.daysLeft} jours</span> },
              { label: "Statut", width: 120, render: (r) => <StatusDot status={r.status === "ISSUED" ? "READY" : r.status}/> },
            ]}
            rows={rows}
          />
      }
    </Card>
  );
}

function LogsBySourceCard({ data }: { data?: AnalyticsResp }) {
  const rows = data?.logsBySource24h ?? [];
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card title="Logs sur 24h" subtitle="Volume par source" pad={false}>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 && <div style={{ color: "var(--text-3)", fontSize: 12 }}>Aucun log enregistré sur les dernières 24h.</div>}
        {rows.map((r) => (
          <div key={r.source} style={{ display: "grid", gridTemplateColumns: "120px 1fr 70px", gap: 12, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.source}</span>
            <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 99 }}>
              <div style={{ width: `${(r.count / max) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 99 }}/>
            </div>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, textAlign: "right", color: "var(--text-2)" }}>{r.count.toLocaleString("fr-FR")}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
