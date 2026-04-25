"use client";
import React from "react";
import { PageHeader, Card, Button, Segmented, Table, StatusDot } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { useServices, Service } from "@/lib/hooks";

export function ServicesScreen() {
  const [kind, setKind] = React.useState<string>("all");
  const servicesQ = useServices(kind);
  const all = servicesQ.data ?? [];
  const rows = all.filter((s) => kind === "all" || s.kind === kind);
  return (
    <div>
      <PageHeader
        eyebrow="systemd · docker · pm2"
        title="Services"
        sub={`${all.filter(s=>s.state==="running").length} running · ${all.filter(s=>s.state==="failed").length} failed`}
        actions={<>
          <Segmented options={[{label:"Tous",value:"all"},{label:"systemd",value:"systemd"},{label:"docker",value:"docker"},{label:"pm2",value:"pm2"}]} value={kind} onChange={setKind}/>
          <Button size="sm" variant="ghost" icon="refresh" onClick={() => servicesQ.refetch()}>Rafraîchir</Button>
        </>}
      />
      <div style={{ padding: "24px 28px 96px" }}>
        <Card pad={false}>
          <Table<Service> columns={[
            { label: "Service", render: r => (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name={r.kind === "docker" ? "framework-docker" : "services"} size={14} style={{ color: "var(--text-3)" }}/>
                <span style={{ fontFamily: "var(--mono)", fontSize: 12.5 }}>{r.name}</span>
              </div>
            )},
            { label: "Type", width: 100, render: r => <span style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-2)" }}>{r.kind}</span> },
            { label: "Site", width: 110, render: r => r.site ? <span style={{ fontSize: 12, color: "var(--text-2)" }}>{r.site}</span> : <span style={{ color: "var(--text-4)" }}>·</span> },
            { label: "Status", width: 110, render: r => <StatusDot status={r.state}/> },
            { label: "Uptime", width: 100, align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.uptime}</span> },
            { label: "CPU",  width: 70, align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: r.cpu > 10 ? "var(--warn)" : "var(--text-2)" }}>{r.cpu.toFixed(1)}%</span> },
            { label: "Mem",  width: 80, align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.mem} MB</span> },
          ]} rows={rows}/>
        </Card>
      </div>
    </div>
  );
}
