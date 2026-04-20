"use client";
import { ReactNode } from "react";
import { Segmented } from "../ui/primitives";
import { Icon } from "../ui/Icon";

export type TweaksState = {
  theme: "dark" | "light";
  density: "confort" | "standard" | "dense";
  accent: string;
};

const ACCENTS = ["#E66A3A","#D4A24C","#6EC28E","#8BB4FF","#B58BFF","#ECECEF"];

export function TweaksPanel({
  state, setState, close,
}: { state: TweaksState; setState: (updater: (s: TweaksState) => TweaksState) => void; close: () => void }) {
  const set = <K extends keyof TweaksState>(k: K, v: TweaksState[K]) => {
    setState(s => ({ ...s, [k]: v }));
    if (k === "theme") document.documentElement.dataset.theme = v as string;
    if (k === "density") document.documentElement.dataset.density = v as string;
    if (k === "accent") document.documentElement.style.setProperty("--signal", v as string);
  };

  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, width: 280, zIndex: 60,
      background: "var(--surface)", border: "1px solid var(--line-strong)", borderRadius: 6,
      boxShadow: "0 12px 30px rgba(0,0,0,0.3)",
    }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Tweaks</span>
        <button onClick={close} style={{ color: "var(--text-3)" }}><Icon name="x" size={12}/></button>
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
        <Row label="Theme">
          <Segmented size="sm" options={[{label:"Dark",value:"dark"},{label:"Light",value:"light"}]} value={state.theme} onChange={v=>set("theme", v as TweaksState["theme"])}/>
        </Row>
        <Row label="Density">
          <Segmented size="sm" options={[{label:"Confort",value:"confort"},{label:"Standard",value:"standard"},{label:"Dense",value:"dense"}]} value={state.density} onChange={v=>set("density", v as TweaksState["density"])}/>
        </Row>
        <Row label="Accent">
          <div style={{ display: "flex", gap: 6 }}>
            {ACCENTS.map(c => (
              <button
                key={c}
                onClick={() => set("accent", c)}
                style={{
                  width: 20, height: 20, borderRadius: 99, background: c,
                  border: state.accent === c ? "2px solid var(--text)" : "1px solid var(--line)",
                }}
              />
            ))}
          </div>
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
      {children}
    </div>
  );
}
