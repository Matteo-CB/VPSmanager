"use client";
import { Icon, IconName } from "../ui/Icon";
import { useSystemOverview, useMe } from "@/lib/hooks";
import type { Route, Go, ScreenId } from "@/lib/route";

type NavItem = { id: ScreenId; label: string; icon: IconName; count?: number; adminOnly?: boolean };

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Plateforme", items: [
    { id: "dashboard", label: "Vue d'ensemble", icon: "dashboard" },
    { id: "sites",     label: "Sites",          icon: "sites" },
    { id: "deployments", label: "Déploiements", icon: "deployments" },
    { id: "analytics", label: "Analytics",      icon: "analytics" },
    { id: "logs",      label: "Logs",           icon: "logs" },
    { id: "terminal",  label: "Terminal",       icon: "terminal" },
  ]},
  { group: "Ressources", items: [
    { id: "databases", label: "Bases de données", icon: "db" },
    { id: "files",     label: "Fichiers",         icon: "files", adminOnly: true },
    { id: "services",  label: "Services",         icon: "services" },
    { id: "dns",       label: "DNS",              icon: "dns" },
    { id: "stripe",    label: "Stripe",           icon: "key" },
  ]},
  { group: "Administration", items: [
    { id: "settings",  label: "Paramètres",       icon: "settings" },
  ]},
];

export function Sidebar({ route, go }: { route: Route; go: Go }) {
  const sys = useSystemOverview();
  const me = useMe();
  const isAdmin = me.data?.user?.role === "ADMIN";
  return (
    <aside style={{
      gridArea: "sidebar",
      background: "var(--surface)",
      borderRight: "1px solid var(--line)",
      width: 224,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      <div style={{ padding: "14px 14px 24px" }}>
        {NAV.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 20 }}>
            <div style={{ padding: "6px 10px", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-4)", fontWeight: 500 }}>{group.group}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {group.items.filter((it) => !it.adminOnly || isAdmin).map((it) => {
                const active = route.screen === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => go(it.id)}
                    style={{
                      display: "grid", gridTemplateColumns: "18px 1fr auto", gap: 10, alignItems: "center",
                      padding: "7px 10px", borderRadius: 4, textAlign: "left",
                      background: active ? "var(--surface-2)" : "transparent",
                      color: active ? "var(--text)" : "var(--text-2)",
                      transition: "background .1s, color .1s",
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <Icon name={it.icon} size={15}/>
                    <span style={{ fontSize: 13 }}>{it.label}</span>
                    {it.count != null && <span style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--mono)" }}>{it.count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto", padding: "12px 14px", borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px" }}>
          <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 99, background: "var(--ok)", display: "inline-block" }}/>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sys.data?.hostname ?? "…"}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)" }}>uptime {sys.data?.uptime ?? "…"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
