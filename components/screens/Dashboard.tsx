"use client";
import React from "react";
import {
  PageHeader, StatCard, Card, Button, Segmented, LineChart, Table, StatusDot,
} from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { frameworkIcon, frameworkLabel } from "@/lib/data";
import { useSystemOverview, useSites, useIncidents, useDeployments, useLogs, useMe, Site, Deployment } from "@/lib/hooks";
import type { Go } from "@/lib/route";

export function DashboardScreen({ go }: { go: Go }) {
  const me = useMe();
  const sysQ = useSystemOverview();
  const sitesQ = useSites();
  const incidentsQ = useIncidents();
  const deploymentsQ = useDeployments();
  const logsQ = useLogs();

  const [cpuSeries, setCpuSeries] = React.useState<number[]>([]);
  const [memSeries, setMemSeries] = React.useState<number[]>([]);
  React.useEffect(() => {
    if (!sysQ.data) return;
    setCpuSeries((s) => [...s, sysQ.data!.cpu.usage].slice(-60));
    setMemSeries((s) => [...s, sysQ.data!.memory.usedPercent].slice(-60));
  }, [sysQ.data]);

  const sites = sitesQ.data ?? [];
  const incidents = incidentsQ.data ?? [];
  const deployments = deploymentsQ.data ?? [];
  const logs = logsQ.data ?? [];

  const cpuNow = sysQ.data?.cpu.usage ?? 0;
  const memNow = sysQ.data?.memory.usedPercent ?? 0;
  const hostname = sysQ.data?.hostname ?? "...";
  const kernel = sysQ.data?.kernel ?? "...";
  const uptime = sysQ.data?.uptime ?? "...";
  const userName = me.data?.user?.name ?? "";

  const greeting = greetingFor(new Date(), userName);
  const peak = cpuSeries.length ? Math.max(...cpuSeries).toFixed(1) : cpuNow.toFixed(1);
  const avg = cpuSeries.length ? (cpuSeries.reduce((s, v) => s + v, 0) / cpuSeries.length).toFixed(1) : cpuNow.toFixed(1);

  return (
    <div>
      <PageHeader
        eyebrow={`${hostname} · ${kernel}`}
        title={greeting}
        sub={`Uptime ${uptime} · ${sites.length} sites · ${incidents.filter(i=>i.open).length} incidents`}
        actions={
          <>
            <Button icon="refresh" variant="ghost" size="sm" onClick={() => { sysQ.refetch(); sitesQ.refetch(); }}/>
            <Button icon="command" variant="secondary" size="sm">Cmd+K</Button>
          </>
        }
      />

      <div style={{ padding: "24px 28px 96px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard
            label="CPU"
            value={cpuNow.toFixed(1)} unit="%"
            sub={sysQ.data ? `Load ${sysQ.data.cpu.load.map(n => n.toFixed(2)).join(" · ")}` : "…"}
            series={cpuSeries.length > 1 ? cpuSeries : undefined} color="var(--text)"
          />
          <StatCard
            label="Memory"
            value={memNow.toFixed(0)}
            unit={sysQ.data ? `% / ${(sysQ.data.memory.totalMb / 1024).toFixed(1)} GB` : "%"}
            sub={sysQ.data ? `${(sysQ.data.memory.usedMb / 1024).toFixed(1)} GB utilisé` : "…"}
            series={memSeries.length > 1 ? memSeries : undefined} color="var(--text)"
          />
          <StatCard
            label="vCPU"
            value={sysQ.data ? String(sysQ.data.cpu.count) : "…"}
            unit="cœurs"
            sub={sysQ.data ? `Load1 ${sysQ.data.cpu.load[0].toFixed(2)}` : ""}
            color="var(--accent)"
          />
          <StatCard
            label="Disk /"
            value={sysQ.data?.disks[0] ? Math.round((sysQ.data.disks[0].usedGb / Math.max(sysQ.data.disks[0].totalGb, 1)) * 100).toString() : "…"}
            unit="% used"
            sub={sysQ.data?.disks[0] ? `${sysQ.data.disks[0].usedGb} / ${sysQ.data.disks[0].totalGb} GB · ${sysQ.data.disks[0].fs}` : ""}
            color="var(--text)"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
          <Card title="CPU temps réel" subtitle="Résolution 4 secondes · dernières 60 mesures" pad={false}>
            <div style={{ padding: "20px 20px 8px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 52, letterSpacing: "-0.02em" }}>{cpuNow.toFixed(1)}<span style={{ fontSize: 18, color: "var(--text-3)", marginLeft: 6 }}>%</span></div>
                <div style={{ color: "var(--text-3)", fontSize: 12 }}>peak {peak}% · avg {avg}%</div>
              </div>
              {cpuSeries.length > 1
                ? <LineChart data={cpuSeries} height={200} color="var(--accent)"/>
                : <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-4)", fontSize: 12 }}>Collecte en cours…</div>}
            </div>
          </Card>

          <Card title="Incidents" actions={<Button size="sm" variant="ghost" iconRight="arrow-right">Tout voir</Button>} pad={false}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {incidents.length === 0 && <div style={{ padding: "24px 20px", color: "var(--text-3)", fontSize: 13 }}>Aucun incident.</div>}
              {incidents.map((i, idx) => (
                <div key={i.id} style={{ padding: "16px 20px", borderBottom: idx < incidents.length - 1 ? "1px solid var(--line)" : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span className={i.open ? "pulse-dot" : ""} style={{ width: 6, height: 6, borderRadius: 99, marginTop: 8, display: "inline-block",
                    background: i.sev === "critical" ? "var(--err)" : i.sev === "warning" ? "var(--warn)" : "var(--info)" }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4 }}>{i.msg}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, display: "flex", gap: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      <span>{i.sev}</span><span>{i.when}</span>{!i.open && <span>Résolu</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>
          <Card
            title="Sites"
            subtitle={`${sites.filter(s=>s.status==="ACTIVE").length} actifs · ${sites.filter(s=>s.status==="BUILDING").length} en build · ${sites.filter(s=>s.status==="FAILED").length} échoué`}
            actions={<>
              <Button size="sm" variant="ghost" icon="search"/>
              <Button size="sm" variant="secondary" icon="plus">Nouveau</Button>
            </>}
            pad={false}
          >
            <Table<Site>
              onRowClick={r => go("site", r.slug)}
              columns={[
                { label: "Site", render: r => (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: "var(--text-3)" }}><Icon name={frameworkIcon(r.framework)} size={16}/></span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <span style={{ fontWeight: 500 }}>{r.name}</span>
                      <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{r.domain}</span>
                    </div>
                  </div>
                )},
                { label: "Framework", width: 110, render: r => <span style={{ fontSize: 12, color: "var(--text-2)" }}>{frameworkLabel(r.framework)}</span> },
                { label: "Status", width: 110, render: r => <StatusDot status={r.status}/> },
                { label: "CPU", align: "right", width: 80, render: r => <span style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--mono)", fontSize: 12, color: r.cpu > 10 ? "var(--warn)" : "var(--text-2)" }}>{r.cpu.toFixed(1)}%</span> },
                { label: "Mem", align: "right", width: 80, render: r => <span style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.mem} MB</span> },
                { label: "Dernier deploy", align: "right", width: 140, render: r => <span style={{ fontSize: 12, color: "var(--text-3)" }}>{r.lastDeploy}</span> },
              ]}
              rows={sites}
            />
          </Card>

          <Card
            title="Activité temps réel"
            subtitle={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ok)", display: "inline-block" }}/> live</span>}
            pad={false}
            actions={<Button size="sm" variant="ghost" iconRight="arrow-right" onClick={()=>go("logs")}>Logs</Button>}
          >
            <div style={{ padding: "10px 0", fontFamily: "var(--mono)", fontSize: 11.5, lineHeight: 1.7, maxHeight: 380, overflowY: "auto" }}>
              {logs.length === 0 && <div style={{ padding: "20px", color: "var(--text-4)", fontSize: 11 }}>Aucun log.</div>}
              {logs.slice(-14).map((l, i) => (
                <div key={i} style={{ padding: "2px 20px", display: "grid", gridTemplateColumns: "auto 62px 1fr", gap: 10, color: "var(--text-3)" }}>
                  <span style={{ color: "var(--text-4)" }}>{l.t.slice(0, 8)}</span>
                  <span style={{ color: "var(--text-3)", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em", alignSelf: "center" }}>{l.src}</span>
                  <span style={{ color: l.lvl === "error" ? "var(--err)" : l.lvl === "warn" ? "var(--warn)" : "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card title="Disques" pad={false}>
            <div>
              {(sysQ.data?.disks ?? []).slice(0, 4).map((d, i, arr) => {
                const pct = (d.usedGb / Math.max(d.totalGb, 1)) * 100;
                const col = pct > 85 ? "var(--err)" : pct > 70 ? "var(--warn)" : "var(--ok)";
                return (
                  <div key={i} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{d.mount}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{d.usedGb} / {d.totalGb} GB</span>
                    </div>
                    <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: col, transition: "width .4s" }}/>
                    </div>
                  </div>
                );
              })}
              {(!sysQ.data || sysQ.data.disks.length === 0) && <div style={{ padding: 20, color: "var(--text-4)", fontSize: 12 }}>Aucune donnée.</div>}
            </div>
          </Card>

          <Card title="Derniers déploiements" pad={false} actions={<Button size="sm" variant="ghost" iconRight="arrow-right" onClick={()=>go("deployments")}>Tous</Button>}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {deployments.length === 0 && <div style={{ padding: 20, color: "var(--text-4)", fontSize: 12 }}>Aucun déploiement.</div>}
              {deployments.slice(0, 6).map((d: Deployment, i) => (
                <div
                  key={d.id}
                  onClick={() => go("deployment", d.id)}
                  style={{
                    padding: "12px 20px", borderBottom: i < 5 ? "1px solid var(--line)" : "none",
                    display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 12, cursor: "pointer",
                  }}
                >
                  <StatusDot status={d.status}/>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.site}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.commit} · {d.msg}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-3)", whiteSpace: "nowrap" }}>{d.when}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function greetingFor(d: Date, name: string): string {
  const h = d.getHours();
  const part = h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  return name ? `${part}, ${name}.` : `${part}.`;
}
