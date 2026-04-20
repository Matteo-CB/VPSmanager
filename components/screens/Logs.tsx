"use client";
import React from "react";
import { PageHeader, Card, Input, Segmented, Button, EmptyState } from "../ui/primitives";
import { useLogs, LogLine } from "@/lib/hooks";

export function LogStream({ height = 580, siteSlug }: { height?: number; siteSlug?: string }) {
  const [paused, setPaused] = React.useState(false);
  const [level, setLevel] = React.useState<string>("all");
  const [src, setSrc] = React.useState<string>("all");
  const [q, setQ] = React.useState("");

  const logsQ = useLogs({
    level: level === "all" ? undefined : level,
    source: src === "all" ? undefined : src,
    q: q || undefined,
    site: siteSlug,
  });

  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => { if (ref.current && !paused) ref.current.scrollTop = ref.current.scrollHeight; }, [logsQ.data, paused]);

  const lines: LogLine[] = logsQ.data ?? [];
  const lvlColor = (l: string) => ({ error: "var(--err)", warn: "var(--warn)", info: "var(--text-2)" } as Record<string, string>)[l] || "var(--text-3)";

  return (
    <Card pad={false}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button size="sm" variant={paused ? "primary" : "ghost"} icon={paused ? "play" : "pause"} onClick={() => setPaused((p) => !p)}>{paused ? "Reprendre" : "Pause"}</Button>
          <span style={{ width: 1, height: 18, background: "var(--line)" }}/>
          <Input size="sm" icon="search" placeholder="Rechercher…" value={q} onChange={setQ} style={{ width: 220 }}/>
          <select value={src} onChange={(e) => setSrc(e.target.value)} style={{ background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)", height: 26, fontSize: 12, borderRadius: 4, padding: "0 8px" }}>
            <option value="all">Toutes sources</option>
            <option value="nginx">nginx</option>
            <option value="app">app</option>
            <option value="postgres">postgres</option>
            <option value="mariadb">mariadb</option>
            <option value="systemd">systemd</option>
            <option value="docker">docker</option>
            <option value="pm2">pm2</option>
            <option value="fail2ban">fail2ban</option>
          </select>
          <Segmented size="sm" options={[{label:"Tous",value:"all"},{label:"Info",value:"info"},{label:"Warn",value:"warn"},{label:"Error",value:"error"}]} value={level} onChange={setLevel}/>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{lines.length} lignes</span>
          <Button size="sm" variant="ghost" icon="refresh" onClick={() => logsQ.refetch()}/>
        </div>
      </div>
      <div ref={ref} style={{ background: "var(--bg)", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7, height, overflowY: "auto", padding: "10px 0" }}>
        {lines.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-4)", fontSize: 12 }}>Aucun log.</div>}
        {lines.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 70px 50px 1fr", gap: 12, padding: "1px 18px", color: "var(--text-3)" }}>
            <span style={{ color: "var(--text-4)" }}>{l.t}</span>
            <span style={{ color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10.5, alignSelf: "center" }}>{l.src}</span>
            <span style={{ color: lvlColor(l.lvl), textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.06em", alignSelf: "center" }}>{l.lvl}</span>
            <span style={{ color: l.lvl === "error" ? "var(--err)" : "var(--text-2)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{l.msg}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function LogsScreen() {
  return (
    <div>
      <PageHeader
        eyebrow="journalctl · nginx · app · systemd · docker · pm2"
        title="Logs"
        sub="Flux unifié temps réel"
        actions={<>
          <Button size="sm" variant="ghost" icon="bell">Créer une alerte</Button>
        </>}
      />
      <div style={{ padding: "24px 28px 96px" }}>
        <LogStream height={620}/>
      </div>
    </div>
  );
}

void EmptyState;
