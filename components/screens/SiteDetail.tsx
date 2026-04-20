"use client";
import React, { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Button, Card, StatCard, Table, StatusDot } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { frameworkLabel } from "@/lib/data";
import { useMe } from "@/lib/hooks";
import type { Go } from "@/lib/route";
import { LogStream } from "./Logs";
import { apiGet, apiPost } from "@/lib/client-api";

type SiteResp = {
  site: {
    id: string; slug: string; name: string; status: string;
    framework: string; runtime: string; productionBranch: string;
    domainPrimary: string | null; port: number | null; deployCount: number;
    cpuUsage: number; memUsage: number;
    installCommand: string | null; buildCommand: string | null; startCommand: string | null;
    outputDirectory: string | null; nodeVersion: string | null; packageManager: string | null;
    domains: { id: string; hostname: string; isPrimary: boolean; certStatus: string; certExpiresAt: string | null; dnsVerified: boolean }[];
    deployments: { id: string; commitSha: string; commitMessage: string | null; commitAuthor: string | null; branch: string; target: string; status: string; durationMs: number | null; queuedAt: string }[];
  }
};

type EnvVar = { id: string; key: string; scope: string; sensitive: boolean; masked: string; canReveal: boolean };

export function SiteDetailScreen({ slug, go }: { slug?: string; go: Go }) {
  const qc = useQueryClient();
  const siteQ = useQuery({
    enabled: !!slug,
    queryKey: ["site-detail", slug],
    queryFn: () => apiGet<SiteResp>(`/api/sites/${slug}`).then((r) => r.site),
  });

  const redeploy = useMutation({
    mutationFn: () => apiPost<{ deploymentId: string }>(`/api/sites/${slug}/redeploy`, {}),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["site-detail", slug] }); go("deployment", r.deploymentId); },
  });

  const [tab, setTab] = React.useState("overview");
  const envQ = useQuery({
    enabled: !!slug && tab === "env",
    queryKey: ["site-env", slug],
    queryFn: () => apiGet<{ data: EnvVar[] }>(`/api/sites/${slug}/env`).then((r) => r.data),
  });

  if (!siteQ.data) {
    return (
      <div>
        <PageHeader title={slug ?? "Site"} sub={siteQ.isError ? "Site introuvable" : "Chargement…"}/>
      </div>
    );
  }
  const site = siteQ.data;
  const deploys = site.deployments;

  const tabs = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "deploys",  label: "Déploiements", count: site.deployCount },
    { id: "env",      label: "Environnement", count: envQ.data?.length },
    { id: "domains",  label: "Domaines", count: site.domains.length },
    { id: "logs",     label: "Logs" },
    { id: "settings", label: "Paramètres" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <a onClick={() => go("sites")} style={{ cursor: "pointer" }}>Sites</a>
          <Icon name="chevron-right" size={11} style={{ color: "var(--text-4)" }}/>
          <span>{site.slug}</span>
          <span style={{ width: 20 }}/>
          <StatusDot status={site.status}/>
        </span>}
        title={site.name}
        sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 12, fontFamily: "var(--mono)", fontSize: 12 }}>
          {site.domainPrimary && <a href={`https://${site.domainPrimary}`} target="_blank" rel="noreferrer" style={{ color: "var(--text-2)", borderBottom: "1px dotted var(--line-strong)" }}>{site.domainPrimary}</a>}
          <Icon name="external" size={12} style={{ color: "var(--text-3)" }}/>
          <span style={{ color: "var(--text-3)" }}>·</span>
          <span style={{ color: "var(--text-3)" }}><Icon name="branch" size={12} style={{ verticalAlign: -2, marginRight: 6 }}/>{site.productionBranch}</span>
          <span style={{ color: "var(--text-3)" }}>·</span>
          <span style={{ color: "var(--text-3)" }}>{frameworkLabel(site.framework)}</span>
        </span>}
        actions={<>
          {site.domainPrimary && <a href={`https://${site.domainPrimary}`} target="_blank" rel="noreferrer"><Button variant="ghost" icon="external" size="sm">Visiter</Button></a>}
          <Button variant="secondary" icon="rollback" size="sm">Rollback</Button>
          <Button variant="primary" icon="deployments" size="sm" onClick={() => redeploy.mutate()} disabled={redeploy.isPending}>{redeploy.isPending ? "Déploiement…" : "Redéployer"}</Button>
        </>}
        tabs={tabs} activeTab={tab} onTab={setTab}
      />

      {tab === "overview" && <SiteOverview site={site} deploys={deploys} go={go}/>}
      {tab === "deploys"  && <SiteDeploys deploys={deploys} go={go}/>}
      {tab === "env"      && <SiteEnv slug={site.slug} vars={envQ.data ?? []}/>}
      {tab === "domains"  && <SiteDomains site={site}/>}
      {tab === "logs"     && <SiteLogs slug={site.slug}/>}
      {tab === "settings" && <SiteSettings site={site}/>}
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (!ms) return "·";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m === 0 ? `${s}s` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
}
function relative(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

function SiteOverview({ site, deploys, go }: { site: SiteResp["site"]; deploys: SiteResp["site"]["deployments"]; go: Go }) {
  const last = deploys[0];
  const readyCount = deploys.filter(d => d.status === "READY").length;
  const errorCount = deploys.filter(d => d.status === "ERROR" || d.status === "FAILED").length;
  return (
    <div style={{ padding: "24px 28px 96px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard label="Déploiements" value={String(site.deployCount)} sub={`${readyCount} ready · ${errorCount} errors`}/>
        <StatCard label="CPU" value={site.cpuUsage.toFixed(1)} unit="%" sub="ressources process"/>
        <StatCard label="Mémoire" value={String(site.memUsage)} unit="MB"/>
        <StatCard label="Domaines" value={String(site.domains.length)} sub={`${site.domains.filter(d => d.certStatus === "ISSUED").length} SSL actifs`}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
        <Card title="Production actuelle" pad={false}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
            {last ? <>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 4, background: "var(--surface-2)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="commit" size={18} style={{ color: "var(--text-2)" }}/>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-3)" }}>{last.commitSha.slice(0, 7)} · {last.branch}</div>
                  <div style={{ fontSize: 14, marginTop: 2 }}>{last.commitMessage ?? ""}</div>
                </div>
                <StatusDot status={last.status}/>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <Field label="Build">{formatDuration(last.durationMs)}</Field>
                <Field label="Auteur">{last.commitAuthor ?? "·"}</Field>
                <Field label="Node">{site.nodeVersion ?? "·"}</Field>
                <Field label="Package manager">{site.packageManager ?? "·"}</Field>
              </div>
            </> : <div style={{ color: "var(--text-3)", fontSize: 12 }}>Aucun déploiement.</div>}
          </div>
        </Card>

        <Card title="Commandes" pad={false}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Install">{site.installCommand ?? "·"}</Field>
            <Field label="Build">{site.buildCommand ?? "·"}</Field>
            <Field label="Start">{site.startCommand ?? "·"}</Field>
            <Field label="Port">{site.port ?? "·"}</Field>
          </div>
        </Card>
      </div>

      <Card title="Déploiements récents" actions={<Button size="sm" variant="ghost" iconRight="arrow-right">Tout voir</Button>} pad={false}>
        <Table<SiteResp["site"]["deployments"][number]>
          onRowClick={(r) => go("deployment", r.id)}
          columns={[
            { label: "Commit", width: 120, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.commitSha.slice(0, 7)}</span> },
            { label: "Message", render: r => <span style={{ fontSize: 13 }}>{r.commitMessage ?? ""}</span> },
            { label: "Branche", width: 140, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.branch}</span> },
            { label: "Cible",   width: 120, render: r => <span style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--text-2)" }}>{r.target}</span> },
            { label: "Status",  width: 110, render: r => <StatusDot status={r.status}/> },
            { label: "Durée",   width: 90, align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{formatDuration(r.durationMs)}</span> },
            { label: "Quand",   width: 120, align: "right", render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{relative(r.queuedAt)}</span> },
          ]}
          rows={deploys.slice(0, 8)}
        />
      </Card>
    </div>
  );
}

function SiteDeploys({ deploys, go }: { deploys: SiteResp["site"]["deployments"]; go: Go }) {
  return (
    <div style={{ padding: "24px 28px 96px" }}>
      <Card pad={false}>
        <Table<SiteResp["site"]["deployments"][number]>
          onRowClick={(r) => go("deployment", r.id)}
          columns={[
            { label: "Status",  width: 110, render: r => <StatusDot status={r.status}/> },
            { label: "Commit",  width: 120, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.commitSha.slice(0, 7)}</span> },
            { label: "Message", render: r => <span style={{ fontSize: 13 }}>{r.commitMessage ?? ""}</span> },
            { label: "Auteur",  width: 110, render: r => <span style={{ fontSize: 12, color: "var(--text-2)" }}>{r.commitAuthor ?? ""}</span> },
            { label: "Branche", width: 160, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.branch}</span> },
            { label: "Cible",   width: 120, render: r => <span style={{ fontSize: 11, color: "var(--text-2)" }}>{r.target}</span> },
            { label: "Durée",   width: 90,  align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{formatDuration(r.durationMs)}</span> },
            { label: "Quand",   width: 120, align: "right", render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{relative(r.queuedAt)}</span> },
          ]}
          rows={deploys}
        />
      </Card>
    </div>
  );
}

function SiteEnv({ slug, vars }: { slug: string; vars: EnvVar[] }) {
  const [revealed, setRevealed] = React.useState<Record<string, string>>({});
  const me = useMe();
  const isAdmin = me.data?.user?.role === "ADMIN";

  const reveal = useMutation({
    mutationFn: async (id: string) => {
      const r = await apiPost<{ id: string; key: string; value: string }>(`/api/sites/${slug}/env`, { action: "reveal", id });
      return r;
    },
    onSuccess: (r) => setRevealed((v) => ({ ...v, [r.id]: r.value })),
  });

  return (
    <div style={{ padding: "24px 28px 96px" }}>
      <Card
        title="Variables d'environnement"
        subtitle={isAdmin ? "Chiffrées au repos. Révélation auditée." : "Lecture seule · role USER ne peut pas révéler les secrets."}
        actions={isAdmin ? <>
          <Button size="sm" variant="ghost" icon="upload">Importer .env</Button>
          <Button size="sm" variant="secondary" icon="plus">Ajouter</Button>
        </> : null}
        pad={false}
      >
        <Table<EnvVar>
          columns={[
            { label: "Clé", width: 260, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.key}</span> },
            { label: "Valeur", render: r => (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {revealed[r.id] ?? r.masked}
                </span>
                {r.canReveal && (
                  <button onClick={() => revealed[r.id] ? setRevealed(v => { const n = { ...v }; delete n[r.id]; return n; }) : reveal.mutate(r.id)} style={{ color: "var(--text-3)" }} title={revealed[r.id] ? "Masquer" : "Révéler"}>
                    <Icon name={revealed[r.id] ? "eye-off" : "eye"} size={14}/>
                  </button>
                )}
              </div>
            )},
            { label: "Scope", width: 140, render: r => <span style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--text-2)" }}>{r.scope}</span> },
          ]}
          rows={vars}
        />
      </Card>
    </div>
  );
}

function SiteDomains({ site }: { site: SiteResp["site"] }) {
  return (
    <div style={{ padding: "24px 28px 96px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Card title="Domaines" actions={<Button size="sm" variant="secondary" icon="plus">Ajouter</Button>} pad={false}>
        <Table<SiteResp["site"]["domains"][number]>
          columns={[
            { label: "Domaine", render: r => (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="globe" size={14} style={{ color: "var(--text-3)" }}/>
                <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{r.hostname}</span>
                {r.isPrimary && <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", border: "1px solid var(--line)", padding: "1px 6px", borderRadius: 3 }}>Principal</span>}
              </div>
            )},
            { label: "TLS", width: 200, render: r => r.certExpiresAt
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12 }}><Icon name="shield" size={12} style={{ color: "var(--ok)" }}/>Let&apos;s Encrypt · expire {new Date(r.certExpiresAt).toLocaleDateString("fr-FR")}</span>
              : <span style={{ fontSize: 12, color: "var(--text-4)" }}>pas de certificat</span>
            },
            { label: "DNS", width: 120, render: r => <StatusDot status={r.dnsVerified ? "READY" : "ERROR"} label={r.dnsVerified ? "Propagé" : "À vérifier"}/> },
          ]}
          rows={site.domains}
        />
      </Card>
    </div>
  );
}

function SiteLogs({ slug }: { slug: string }) {
  return <div style={{ padding: "24px 28px 96px" }}><LogStream height={520} siteSlug={slug}/></div>;
}

function SiteSettings({ site }: { site: SiteResp["site"] }) {
  return (
    <div style={{ padding: "24px 28px 96px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Card title="Général" pad={false}>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          <SettingField label="Nom du site" value={site.name}/>
          <SettingField label="Slug" value={site.slug} mono/>
          <SettingField label="Branche production" value={site.productionBranch} mono/>
          <SettingField label="Framework" value={frameworkLabel(site.framework)}/>
        </div>
      </Card>
      <Card title="Build & Runtime" pad={false}>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
          <SettingField label="Install command" value={site.installCommand ?? "·"} mono/>
          <SettingField label="Build command"   value={site.buildCommand ?? "·"} mono/>
          <SettingField label="Start command"   value={site.startCommand ?? "·"} mono/>
          <SettingField label="Output dir"      value={site.outputDirectory ?? "·"} mono/>
          <SettingField label="Node version"    value={site.nodeVersion ?? "·"}/>
          <SettingField label="Port"            value={String(site.port ?? "·")}/>
        </div>
      </Card>
    </div>
  );
}

export function SettingField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontFamily: mono ? "var(--mono)" : "inherit", fontSize: 13, color: "var(--text)", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "8px 10px", borderRadius: 3 }}>{value}</span>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: "var(--mono)", color: "var(--text-2)" }}>{children}</span>
    </div>
  );
}
