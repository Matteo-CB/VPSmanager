"use client";
import React from "react";
import { Icon } from "../ui/Icon";
import { Kbd } from "../ui/primitives";
import { frameworkIcon } from "@/lib/data";
import { useSites, useDeployments } from "@/lib/hooks";
import { NAV } from "./Sidebar";
import type { Go } from "@/lib/route";

export function CommandPalette({ open, close, go }: { open: boolean; close: () => void; go: Go }) {
  const [q, setQ] = React.useState("");
  const sites = useSites();
  const deploys = useDeployments();

  React.useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, close]);
  if (!open) return null;

  type Item = { kind: string; label: string; sub?: string; run: () => void; icon: string };
  const items: Item[] = [
    ...NAV.flatMap((g) => g.items.map((i) => ({
      kind: "Nav", label: i.label, run: () => { go(i.id); close(); }, icon: i.icon as string,
    }))),
    ...(sites.data ?? []).map((s) => ({
      kind: "Site", label: s.name, sub: s.domain,
      run: () => { go("site", s.slug); close(); }, icon: frameworkIcon(s.framework),
    })),
    ...(deploys.data ?? []).slice(0, 5).map((d) => ({
      kind: "Deploy", label: `${d.site} · ${d.commit}`, sub: d.msg,
      run: () => { go("deployment", d.id); close(); }, icon: "deployments",
    })),
  ];
  const filtered = items
    .filter((it) => !q || (it.label + " " + (it.sub || "")).toLowerCase().includes(q.toLowerCase()))
    .slice(0, 12);

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 70, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 110 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 560, background: "var(--surface)", border: "1px solid var(--line-strong)", borderRadius: 6,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)", overflow: "hidden",
      }}>
        <div style={{ borderBottom: "1px solid var(--line)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="search" size={15} style={{ color: "var(--text-3)" }}/>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tapez pour chercher…"
            style={{ flex: 1, background: "transparent", border: 0, outline: "none", color: "var(--text)", fontSize: 14 }}
          />
          <Kbd>ESC</Kbd>
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {filtered.map((it, i) => (
            <button
              key={i}
              onClick={it.run}
              style={{
                width: "100%", display: "grid", gridTemplateColumns: "auto 60px 1fr auto", gap: 12, alignItems: "center",
                padding: "10px 16px", textAlign: "left", borderBottom: "1px solid var(--line)",
                background: "transparent",
              }}
            >
              <Icon name={it.icon} size={14} style={{ color: "var(--text-3)" }}/>
              <span style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-4)" }}>{it.kind}</span>
              <span style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {it.label}
                {it.sub && <span style={{ color: "var(--text-3)", marginLeft: 10, fontSize: 12 }}>{it.sub}</span>}
              </span>
              <Icon name="arrow-right" size={12} style={{ color: "var(--text-4)" }}/>
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>Aucun résultat.</div>}
        </div>
      </div>
    </div>
  );
}
