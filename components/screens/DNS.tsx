"use client";
import React from "react";
import { PageHeader, Card, Button, Table, StatusDot, EmptyState } from "../ui/primitives";
import { useDnsZones, useDnsRecords, useDnsChecks, DnsRecord } from "@/lib/hooks";

type CheckRow = { label: string; expected: string; seen: string; ok: boolean };

export function DnsScreen() {
  const zonesQ = useDnsZones();
  const zones = zonesQ.data ?? [];
  const [selectedDomain, setSelectedDomain] = React.useState<string | null>(null);
  React.useEffect(() => { if (zones.length && !selectedDomain) setSelectedDomain(zones[0].domain); }, [zones, selectedDomain]);

  const recordsQ = useDnsRecords(selectedDomain ?? undefined);
  const checksQ = useDnsChecks(selectedDomain ?? undefined);

  return (
    <div>
      <PageHeader
        eyebrow={`${zones.length} zones gérées par le panel`}
        title="DNS"
        sub={zones.reduce((s, z) => s + z.records, 0) ? `${zones.reduce((s, z) => s + z.records, 0)} records au total` : ""}
        actions={<>
          <Button size="sm" variant="ghost" icon="download">Exporter zone</Button>
          <Button size="sm" variant="secondary" icon="plus">Ajouter un enregistrement</Button>
        </>}
      />
      <div style={{ padding: "24px 28px 96px", display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
        <Card pad={false}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Zones</div>
          {zones.map((z) => (
            <div
              key={z.id}
              onClick={() => setSelectedDomain(z.domain)}
              style={{
                padding: "14px 16px", borderBottom: "1px solid var(--line)",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
                background: selectedDomain === z.domain ? "var(--surface-2)" : "transparent",
                borderLeft: selectedDomain === z.domain ? "2px solid var(--signal)" : "2px solid transparent",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{z.domain}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 2 }}>{z.records} records · {z.provider}</div>
              </div>
            </div>
          ))}
          {zones.length === 0 && <div style={{ padding: 20, fontSize: 12, color: "var(--text-4)" }}>Aucune zone.</div>}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!selectedDomain ? <Card pad><EmptyState title="Sélectionne une zone" hint="Choisis une zone à gauche pour voir ses enregistrements et vérifications."/></Card> : (
            <>
              <Card pad={false}>
                <div style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--line)" }}>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Zone</div>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 32, letterSpacing: "-0.01em", marginTop: 4 }}>{selectedDomain}</div>
                  </div>
                  <Button size="sm" variant="ghost" icon="refresh" onClick={() => { recordsQ.refetch(); checksQ.refetch(); }}>Vérifier propagation</Button>
                </div>
                <Table<DnsRecord> columns={[
                  { label: "Type", width: 80, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--text-2)", background: "var(--surface-2)", border: "1px solid var(--line)", padding: "2px 8px", borderRadius: 3, display: "inline-block" }}>{r.type}</span> },
                  { label: "Nom",  width: 120, render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.name}</span> },
                  { label: "Valeur", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.content}</span> },
                  { label: "TTL",  width: 80, align: "right", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-3)" }}>{r.ttl}s</span> },
                  { label: "",     width: 80, render: r => r.proxied ? <span style={{ fontSize: 10, letterSpacing: "0.06em", color: "var(--accent)", textTransform: "uppercase" }}>Proxied</span> : null },
                ]} rows={recordsQ.data ?? []}/>
              </Card>

              <Card title="Vérifications propagation" pad={false}>
                {checksQ.isLoading ? <div style={{ padding: 20, color: "var(--text-3)", fontSize: 12 }}>Résolution DNS en cours…</div> :
                  <Table<CheckRow> columns={[
                    { label: "Check", render: r => <span>{r.label}</span> },
                    { label: "Valeur attendue", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-3)" }}>{r.expected}</span> },
                    { label: "Vu", render: r => <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-2)" }}>{r.seen}</span> },
                    { label: "", width: 110, render: r => <StatusDot status={r.ok ? "READY" : "ERROR"} label={r.ok ? "Propagé" : "En attente"}/> },
                  ]} rows={checksQ.data ?? []}/>
                }
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
