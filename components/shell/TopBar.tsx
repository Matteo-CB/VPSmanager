"use client";
import { Button, Kbd } from "../ui/primitives";
import { Icon } from "../ui/Icon";
import { useMe } from "@/lib/hooks";

export function TopBar({ onCmdK }: { onCmdK: () => void }) {
  const me = useMe();
  const user = me.data?.user;
  const display = user?.name ?? user?.email?.split("@")[0] ?? "…";
  const initials = user?.initials ?? (user?.email?.slice(0, 2).toUpperCase() ?? "··");
  return (
    <header style={{
      gridArea: "topbar",
      borderBottom: "1px solid var(--line)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 18px 0 18px", background: "var(--surface)", minWidth: 0,
    }}>
      <button onClick={onCmdK} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
        background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 4, width: 380,
        color: "var(--text-3)", textAlign: "left",
      }}>
        <Icon name="search" size={13}/>
        <span style={{ fontSize: 12.5, flex: 1 }}>Chercher un site, déploiement, log…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button size="sm" variant="ghost" icon="bell" title="Notifications"/>
        <div style={{ width: 1, height: 18, background: "var(--line)", marginLeft: 4 }}/>
        <button style={{
          display: "flex", alignItems: "center", gap: 10, padding: "4px 4px 4px 10px",
          border: "1px solid var(--line)", borderRadius: 99, background: "var(--surface-2)",
        }}>
          <span style={{ fontSize: 12, color: "var(--text-2)" }}>{display}</span>
          <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--surface)", border: "1px solid var(--line)", fontSize: 10, fontFamily: "var(--mono)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{initials}</span>
        </button>
      </div>
    </header>
  );
}

export function LogoBadge() {
  return (
    <div style={{ gridArea: "logo", width: 224, borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
      <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/></svg>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "var(--mono)", color: "var(--text-2)" }}>Console</span>
      </div>
    </div>
  );
}
