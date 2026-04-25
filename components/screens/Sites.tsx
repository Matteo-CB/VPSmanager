"use client";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader, Input, Segmented, Button, Card, Table, StatusDot } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { frameworkIcon, frameworkLabel } from "@/lib/data";
import { useSites, useMe, Site } from "@/lib/hooks";
import type { Go } from "@/lib/route";
import { NewSiteWizard } from "./NewSiteWizard";

export function SitesScreen({ go }: { go: Go }) {
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [view, setView] = React.useState<"list" | "grid">("list");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const qc = useQueryClient();
  const sitesQ = useSites();
  const me = useMe();
  const isAdmin = me.data?.user?.role === "ADMIN";
  const allSites = sitesQ.data ?? [];

  const sites = allSites.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (q && !(s.name + s.domain).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Tous les projets sur cette machine"
        title="Sites"
        sub={`${allSites.length} sites · ${allSites.filter(s=>s.status==="ACTIVE").length} actifs`}
        actions={
          <>
            <Input icon="search" placeholder="Chercher un site…" value={q} onChange={setQ} style={{ width: 240 }}/>
            <Segmented options={[{label:"Tous",value:"all"},{label:"Actifs",value:"ACTIVE"},{label:"Build",value:"BUILDING"},{label:"Échec",value:"FAILED"},{label:"Pause",value:"PAUSED"}]} value={statusFilter} onChange={setStatusFilter}/>
            <Segmented size="sm" options={[{label:"Liste",value:"list"},{label:"Grille",value:"grid"}]} value={view} onChange={v => setView(v as "list" | "grid")}/>
            {isAdmin && <Button variant="primary" icon="plus" size="sm" onClick={() => setWizardOpen(true)}>Nouveau site</Button>}
          </>
        }
      />
      <NewSiteWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={(slug, deploymentId) => { qc.invalidateQueries({ queryKey: ["sites"] }); go("deployment", deploymentId); void slug; }}
      />

      <div style={{ padding: "24px 28px 96px" }}>
        {view === "list" ? (
          <Card pad={false}>
            <Table<Site>
              onRowClick={r => go("site", r.slug)}
              columns={[
                { label: "Nom", render: r => (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: "var(--text-3)" }}><Icon name={frameworkIcon(r.framework)} size={18}/></span>
                    <div>
                      <div style={{ fontWeight: 500, fontFamily: "var(--serif)", fontSize: 16, letterSpacing: "-0.01em" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{r.domain}</div>
                    </div>
                  </div>
                )},
                { label: "Framework", width: 130, render: r => <span style={{ fontSize: 12, color: "var(--text-2)" }}>{frameworkLabel(r.framework)}</span> },
                { label: "Branche", width: 140, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}><Icon name="branch" size={12} style={{ marginRight: 6, verticalAlign: -2, color: "var(--text-3)" }}/>{r.branch}</span> },
                { label: "Status", width: 110, render: r => <StatusDot status={r.status}/> },
                { label: "Deploys", align: "right", width: 90, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.deploys}</span> },
                { label: "CPU", align: "right", width: 70, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: r.cpu > 10 ? "var(--warn)" : "var(--text-2)" }}>{r.cpu.toFixed(1)}%</span> },
                { label: "Mémoire", align: "right", width: 90, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.mem} MB</span> },
                { label: "Dernier deploy", align: "right", width: 140, render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{r.lastDeploy}</span> },
                { label: "", width: 40, render: () => <Icon name="chevron-right" size={14} style={{ color: "var(--text-4)" }}/> },
              ]}
              rows={sites}
              rowHeight={56}
            />
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {sites.map((s) => (
              <div
                key={s.id}
                onClick={() => go("site", s.slug)}
                style={{
                  background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6,
                  padding: 20, cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 16, minHeight: 200,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Icon name={frameworkIcon(s.framework)} size={22} style={{ color: "var(--text-3)" }}/>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 22, letterSpacing: "-0.01em", marginTop: 8 }}>{s.name}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{s.domain}</div>
                  </div>
                  <StatusDot status={s.status}/>
                </div>
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)", paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                  <span>{s.deploys} deploys</span>
                  <span>{s.cpu.toFixed(1)}% · {s.mem} MB</span>
                  <span>{s.lastDeploy}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
