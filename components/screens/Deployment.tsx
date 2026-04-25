"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Card, Button, StatusDot, Input, Segmented, Table, EmptyState } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { useDeployments, Deployment } from "@/lib/hooks";
import { apiGet } from "@/lib/client-api";
import type { Go } from "@/lib/route";

type DeployResp = {
  deployment: {
    id: string; commitSha: string; commitMessage: string | null; commitAuthor: string | null;
    branch: string; target: string; status: string; durationMs: number | null; queuedAt: string;
    site: { slug: string; name: string; domainPrimary: string | null };
    logs: { id: string; seq: number; stream: string; message: string; timestamp: string }[];
  };
};

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

export function DeploymentScreen({ id, go }: { id?: string; go: Go }) {
  const q = useQuery({
    enabled: !!id,
    queryKey: ["deployment", id],
    queryFn: () => apiGet<DeployResp>(`/api/deployments/${id}`).then((r) => r.deployment),
    refetchInterval: (d) => {
      const dep = d?.state?.data;
      return dep && (dep.status === "BUILDING" || dep.status === "INSTALLING" || dep.status === "CLONING" || dep.status === "DEPLOYING") ? 2000 : false;
    },
  });

  const logRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [q.data?.logs.length]);

  if (!q.data) {
    return <div style={{ padding: 40, color: "var(--text-3)", fontSize: 13 }}>{q.isError ? "Déploiement introuvable." : "Chargement…"}</div>;
  }
  const dep = q.data;
  const isLive = ["BUILDING", "INSTALLING", "CLONING", "DEPLOYING"].includes(dep.status);

  return (
    <div>
      <PageHeader
        eyebrow={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <a onClick={() => go("deployments")} style={{ cursor: "pointer" }}>Déploiements</a>
          <Icon name="chevron-right" size={11} style={{ color: "var(--text-4)" }}/>
          <a onClick={() => go("site", dep.site.slug)} style={{ cursor: "pointer" }}>{dep.site.name}</a>
          <Icon name="chevron-right" size={11} style={{ color: "var(--text-4)" }}/>
          <span style={{ fontFamily: "var(--mono)" }}>{dep.id}</span>
        </span>}
        title={<span>{dep.commitMessage ?? "(pas de message)"}</span>}
        sub={<span style={{ display: "inline-flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--text-3)" }}>
          <StatusDot status={dep.status}/>
          <span style={{ fontFamily: "var(--mono)" }}>{dep.commitSha.slice(0, 7)}</span>
          <span><Icon name="branch" size={11} style={{ verticalAlign: -2, marginRight: 6 }}/>{dep.branch}</span>
          {dep.commitAuthor && <span>par {dep.commitAuthor}</span>}
          <span>· {dep.target}</span>
          <span>· {formatDuration(dep.durationMs)}</span>
          <span>· {relative(dep.queuedAt)}</span>
        </span>}
        actions={dep.status === "READY" && dep.site.domainPrimary
          ? <a href={`https://${dep.site.domainPrimary}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" icon="external">Visiter</Button></a>
          : null}
      />

      <div style={{ padding: "24px 28px 96px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Card pad={false} bleed>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Build log</span>
              {isLive && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--info)" }}><span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: 99, background: "var(--info)", display: "inline-block" }}/>STREAMING</span>}
            </div>
          </div>
          <div ref={logRef} style={{ background: "var(--bg)", color: "var(--text-2)", fontFamily: "var(--mono)", fontSize: 12.5, lineHeight: 1.65, padding: "14px 18px", height: 520, overflowY: "auto" }}>
            {dep.logs.length === 0 ? <EmptyState title="Aucun log" hint={isLive ? "Streaming en cours…" : "Ce déploiement n'a produit aucun log."}/>
              : dep.logs.map((l) => {
                const t = new Date(l.timestamp).toISOString().slice(11, 23);
                const isErr = /err|fail|error/i.test(l.message);
                const isOk = /ready|ok|success/i.test(l.message);
                return (
                  <div key={l.id} style={{ display: "grid", gridTemplateColumns: "90px 60px 1fr", gap: 14 }}>
                    <span style={{ color: "var(--text-4)" }}>{t}</span>
                    <span style={{ color: "var(--text-4)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", alignSelf: "center" }}>{l.stream}</span>
                    <span style={{ color: isErr ? "var(--err)" : isOk ? "var(--ok)" : "var(--text-2)", whiteSpace: "pre-wrap" }}>{l.message}</span>
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function DeploymentsScreen({ go }: { go: Go }) {
  const [q, setQ] = React.useState("");
  const deploymentsQ = useDeployments();
  const all = deploymentsQ.data ?? [];
  const rows = all.filter((d) => !q || (d.site + d.msg + d.commit).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Déploiements"
        sub="Journal unifié de tous les sites"
        actions={<Input icon="search" placeholder="Commit, message, site…" value={q} onChange={setQ} style={{ width: 280 }}/>}
      />
      <div style={{ padding: "24px 28px 96px" }}>
        <Card pad={false}>
          <Table<Deployment>
            onRowClick={(r) => go("deployment", r.id)}
            columns={[
              { label: "Status",  width: 110, render: r => <StatusDot status={r.status}/> },
              { label: "Site",    width: 160, render: r => <span style={{ fontWeight: 500 }}>{r.site}</span> },
              { label: "Commit",  width: 110, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.commit}</span> },
              { label: "Message", render: r => <span>{r.msg}</span> },
              { label: "Auteur",  width: 100, render: r => <span style={{ fontSize: 12, color: "var(--text-2)" }}>{r.author}</span> },
              { label: "Cible",   width: 110, render: r => <span style={{ fontSize: 11, color: "var(--text-2)", letterSpacing: "0.06em" }}>{r.target}</span> },
              { label: "Durée",   width: 80,  align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.duration}</span> },
              { label: "Quand",   width: 130, align: "right", render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{r.when}</span> },
            ]}
            rows={rows}
          />
        </Card>
      </div>
    </div>
  );
}
