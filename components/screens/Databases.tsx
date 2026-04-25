"use client";
import React from "react";
import { PageHeader, Card, Table, StatusDot, EmptyState } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { useDatabases, useDatabaseTables, useDatabaseDumps, Database } from "@/lib/hooks";
import { Field } from "./SiteDetail";

export function DatabasesScreen() {
  const dbsQ = useDatabases();
  const dbs = dbsQ.data ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  React.useEffect(() => { if (dbs.length && !selectedId) setSelectedId(dbs[0].id); }, [dbs, selectedId]);

  const selected = dbs.find(d => d.id === selectedId);
  const tables = useDatabaseTables(selected?.id);
  const dumps = useDatabaseDumps(selected?.id);

  return (
    <div>
      <PageHeader
        eyebrow={dbsQ.data ? `${[...new Set(dbs.map(d => d.engine))].join(" · ")}` : ""}
        title="Bases de données"
        sub={`${dbs.length} bases`}
      />

      <div style={{ padding: "24px 28px 96px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 14 }}>
        <Card pad={false}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Toutes les bases</div>
          {dbs.map((db) => (
            <div
              key={db.id}
              onClick={() => setSelectedId(db.id)}
              style={{
                padding: "14px 16px", borderBottom: "1px solid var(--line)", cursor: "pointer",
                display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                background: selectedId === db.id ? "var(--surface-2)" : "transparent",
                borderLeft: selectedId === db.id ? "2px solid var(--signal)" : "2px solid transparent",
              }}
            >
              <Icon name="db" size={15} style={{ color: "var(--text-3)" }}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{db.name}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-3)" }}>{db.engine} {db.version}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>{db.size}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)" }}>{db.connections} conn.</div>
              </div>
            </div>
          ))}
          {dbs.length === 0 && <div style={{ padding: 20, fontSize: 12, color: "var(--text-4)" }}>Aucune base.</div>}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!selected ? <Card pad><EmptyState title="Aucune base sélectionnée" hint="Choisis une base dans la liste à gauche."/></Card> : <DbDetail selected={selected} tables={tables.data} tablesNote={tables.data?.note} dumps={dumps.data}/>}
        </div>
      </div>
    </div>
  );
}

function DbDetail({ selected, tables, tablesNote, dumps }: {
  selected: Database;
  tables?: { data: { name: string; rows: number; size: string; idx: number }[]; note?: string };
  tablesNote?: string;
  dumps?: { id: string; t: string; size: string; kind: string; status: string }[];
}) {
  const connString = selected.engine === "POSTGRES" ? `postgresql://127.0.0.1:${selected.id}/`
    : selected.engine === "MONGO" ? "mongodb://127.0.0.1:27017/"
    : selected.engine === "REDIS" ? "redis://127.0.0.1:6379/"
    : "mysql://127.0.0.1:3306/";
  return <>
    <Card pad={false}>
      <div style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>{selected.engine} · {selected.version}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 32, letterSpacing: "-0.01em", marginTop: 4 }}>{selected.name}</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-3)", marginTop: 6 }}>{connString}{selected.name}</div>
        </div>
      </div>
      <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        <Field label="Taille">{selected.size}</Field>
        <Field label="Connexions">{selected.connections}</Field>
        <Field label="Engine">{selected.engine}</Field>
        <Field label="Version">{selected.version ?? "·"}</Field>
      </div>
    </Card>

    <Card title="Tables" subtitle={tablesNote ?? `${tables?.data.length ?? 0} tables`} pad={false}>
      {tablesNote ? <div style={{ padding: 20, color: "var(--text-3)", fontSize: 12 }}>{tablesNote}</div> :
        <Table<{ name: string; rows: number; size: string; idx: number }>
          columns={[
            { label: "Table", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.name}</span> },
            { label: "Lignes", align: "right", width: 120, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.rows.toLocaleString("fr-FR")}</span> },
            { label: "Taille", align: "right", width: 100, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.size}</span> },
            { label: "Index", align: "right", width: 80, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-3)" }}>{r.idx}</span> },
          ]}
          rows={tables?.data ?? []}
        />
      }
    </Card>

    <Card title="Derniers dumps" pad={false}>
      {dumps && dumps.length > 0
        ? <Table<{ id: string; t: string; size: string; kind: string; status: string }>
            columns={[
              { label: "Timestamp", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.t}</span> },
              { label: "Taille", width: 110, align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.size}</span> },
              { label: "Source", width: 150, render: r => <span style={{ fontSize: 12, color: "var(--text-2)" }}>{r.kind}</span> },
              { label: "Status", width: 100, render: r => <StatusDot status={r.status === "success" ? "READY" : "ERROR"} label={r.status}/> },
            ]}
            rows={dumps}
          />
        : <div style={{ padding: 20, color: "var(--text-3)", fontSize: 12 }}>Aucun dump enregistré.</div>}
    </Card>
  </>;
}
