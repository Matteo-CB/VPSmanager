"use client";
import React, { CSSProperties, ReactNode } from "react";
import { Icon, IconName } from "./Icon";

type StatusMeta = { c: string; l: string; pulse?: boolean };
const statusMeta: Record<string, StatusMeta> = {
  READY:       { c: "var(--ok)",    l: "Ready" },
  ACTIVE:      { c: "var(--ok)",    l: "Running" },
  BUILDING:    { c: "var(--info)",  l: "Building",   pulse: true },
  QUEUED:      { c: "var(--info)",  l: "Queued" },
  CLONING:     { c: "var(--info)",  l: "Cloning",    pulse: true },
  INSTALLING:  { c: "var(--info)",  l: "Installing", pulse: true },
  DEPLOYING:   { c: "var(--info)",  l: "Deploying",  pulse: true },
  ERROR:       { c: "var(--err)",   l: "Error" },
  FAILED:      { c: "var(--err)",   l: "Failed" },
  CANCELED:    { c: "var(--text-3)",l: "Canceled" },
  SUPERSEDED:  { c: "var(--text-3)",l: "Superseded" },
  PAUSED:      { c: "var(--text-3)",l: "Paused" },
  CREATING:    { c: "var(--info)",  l: "Creating",   pulse: true },
  DELETING:    { c: "var(--err)",   l: "Deleting",   pulse: true },
  running:     { c: "var(--ok)",    l: "Running" },
  failed:      { c: "var(--err)",   l: "Failed" },
  stopped:     { c: "var(--text-3)",l: "Stopped" },
  critical:    { c: "var(--err)",   l: "Critical" },
  warning:     { c: "var(--warn)",  l: "Warning" },
  info:        { c: "var(--info)",  l: "Info" },
};

export function StatusDot({ status, label, size = 6 }: { status: string; label?: string; size?: number }) {
  const m = statusMeta[status] || { c: "var(--text-3)", l: status };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: "0.08em", color: "var(--text-2)", textTransform: "uppercase" }}>
      <span className={m.pulse ? "pulse-dot" : ""} style={{ width: size, height: size, borderRadius: 99, background: m.c, display: "inline-block" }}/>
      {label || m.l}
    </span>
  );
}

type BtnProps = {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  icon?: IconName | string;
  iconRight?: IconName | string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
  type?: "button" | "submit" | "reset";
};

export function Button({
  children, variant = "secondary", size = "md", icon, iconRight, onClick, disabled,
  style = {}, title, type = "button",
}: BtnProps) {
  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 8,
    height: size === "sm" ? 26 : size === "lg" ? 36 : 30,
    padding: size === "sm" ? "0 10px" : "0 14px",
    fontSize: size === "sm" ? 12 : 13,
    borderRadius: 4, border: "1px solid transparent",
    fontWeight: 500, transition: "background .12s ease, border-color .12s ease, opacity .12s ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? .5 : 1,
    whiteSpace: "nowrap",
    lineHeight: 1,
  };
  let vs: CSSProperties = {};
  if (variant === "primary") vs = { background: "var(--signal)", color: "#0B0B0D", border: "1px solid var(--signal)" };
  else if (variant === "secondary") vs = { background: "transparent", color: "var(--text)", border: "1px solid var(--line)" };
  else if (variant === "ghost") vs = { background: "transparent", color: "var(--text)" };
  else if (variant === "destructive") vs = { background: "transparent", color: "var(--err)", border: "1px solid var(--err)" };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={e => {
        if (variant === "ghost") (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-2)";
        if (variant === "secondary") (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line-strong)";
      }}
      onMouseLeave={e => {
        if (variant === "ghost") (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        if (variant === "secondary") (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
      }}
      style={{ ...base, ...vs, ...style }}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 12 : 14}/> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === "sm" ? 12 : 14}/> : null}
    </button>
  );
}

type CardProps = {
  children?: ReactNode;
  style?: CSSProperties;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  pad?: boolean;
  bleed?: boolean;
};
export function Card({ children, style = {}, title, subtitle, actions, pad = true, bleed = false }: CardProps) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden", ...style }}>
      {(title || actions) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
          <div>
            {title && <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{subtitle}</div>}
          </div>
          {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
        </div>
      )}
      {bleed ? children : <div style={{ padding: pad ? 20 : 0 }}>{children}</div>}
    </div>
  );
}

export function Sparkline({
  data, color = "var(--accent)", width = 120, height = 32, fill = true, strokeWidth = 1,
}: { data: number[]; color?: string; width?: number; height?: number; fill?: boolean; strokeWidth?: number }) {
  if (!data || !data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const pad = 2;
  const stepX = (width - pad * 2) / (data.length - 1);
  const norm = (v: number) => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const pts = data.map((v, i) => `${pad + i * stepX},${norm(v).toFixed(2)}`).join(" ");
  const areaPts = `${pad},${height-pad} ${pts} ${width-pad},${height-pad}`;
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {fill && <polygon points={areaPts} fill={color} opacity="0.07"/>}
      <polyline points={pts} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function StatCard({
  label, value, unit, sub, series, color = "var(--text)",
}: { label: ReactNode; value: ReactNode; unit?: ReactNode; sub?: ReactNode; series?: number[]; color?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 6, padding: "18px 20px 16px", display: "flex", flexDirection: "column", gap: 12, minHeight: 108 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{label}</div>
        {series && <Sparkline data={series} color={color} width={96} height={28}/>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, letterSpacing: "-0.02em" }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 38, lineHeight: 1, color }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: "var(--text-3)" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: "var(--text-3)" }}>{sub}</div>}
    </div>
  );
}

export function LineChart({
  data, height = 180, color = "var(--accent)", showAxis = true,
}: { data: number[]; height?: number; color?: string; yLabel?: string; showAxis?: boolean }) {
  const width = 100;
  if (!data.length) return null;
  const min = Math.min(...data) * 0.9, max = Math.max(...data) * 1.05;
  const stepX = width / (data.length - 1);
  const norm = (v: number) => (height - 20) - ((v - min) / (max - min || 1)) * (height - 40);
  const pts = data.map((v, i) => `${i * stepX},${norm(v).toFixed(2)}`).join(" ");
  const ticks = 4;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width="100%" height={height} style={{ display: "block", overflow: "visible" }}>
      {showAxis && Array.from({ length: ticks }).map((_, i) => {
        const y = 10 + (i * (height - 30) / (ticks - 1));
        return <line key={i} x1="0" x2={width} y1={y} y2={y} stroke="var(--line)" strokeWidth="0.25" vectorEffect="non-scaling-stroke"/>;
      })}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
      <polygon points={`0,${height-20} ${pts} ${width},${height-20}`} fill={color} opacity="0.06"/>
    </svg>
  );
}

export type Column<T> = {
  label: ReactNode;
  key?: keyof T;
  render?: (r: T, i: number) => ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
  maxWidth?: number | string;
  wrap?: boolean;
};

export function Table<T>({
  columns, rows, onRowClick, stickyHeader = true, rowHeight,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (r: T) => void;
  stickyHeader?: boolean;
  rowHeight?: number;
}) {
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                style={{
                  textAlign: c.align || "left", padding: "10px 16px", fontWeight: 500,
                  fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--text-3)",
                  borderBottom: "1px solid var(--line)",
                  position: stickyHeader ? "sticky" : "static", top: 0, background: "var(--surface)",
                  width: c.width,
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              onClick={() => onRowClick && onRowClick(r)}
              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
              style={{ cursor: onRowClick ? "pointer" : "default", transition: "background .1s" }}
            >
              {columns.map((c, j) => (
                <td
                  key={j}
                  style={{
                    padding: "0 16px",
                    height: rowHeight || "var(--row-h)",
                    borderBottom: "1px solid var(--line)",
                    color: "var(--text)",
                    textAlign: c.align || "left",
                    verticalAlign: "middle",
                    whiteSpace: c.wrap ? "normal" : "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: c.maxWidth,
                  }}
                >
                  {c.render ? c.render(r, i) : (c.key ? (r[c.key] as ReactNode) : null)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Input({
  value, onChange, placeholder, icon, size = "md", style = {}, mono = false, onKeyDown, autoFocus, type = "text",
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  icon?: IconName | string;
  size?: "sm" | "md" | "lg";
  style?: CSSProperties;
  mono?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  type?: string;
}) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "var(--surface-2)",
      border: "1px solid var(--line)", borderRadius: 4,
      padding: size === "sm" ? "0 8px" : "0 10px",
      height: size === "sm" ? 26 : size === "lg" ? 36 : 30,
      color: "var(--text-3)",
      transition: "border-color .12s",
      ...style,
    }}>
      {icon && <Icon name={icon} size={14}/>}
      <input
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        type={type}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: "transparent", border: 0, outline: "none",
          color: "var(--text)",
          fontSize: size === "sm" ? 12 : 13,
          width: "100%",
          fontFamily: mono ? "var(--mono)" : "inherit",
        }}
      />
    </div>
  );
}

export function Tabs({
  tabs, active, onChange, right,
}: {
  tabs: { id: string; label: ReactNode; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  right?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingRight: 4 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: "10px 14px 11px",
              fontSize: 13,
              color: active === t.id ? "var(--text)" : "var(--text-3)",
              borderBottom: `1px solid ${active === t.id ? "var(--text)" : "transparent"}`,
              marginBottom: -1,
              fontWeight: active === t.id ? 500 : 400,
            }}
          >
            {t.label}
            {t.count != null && <span style={{ marginLeft: 6, color: "var(--text-4)", fontVariantNumeric: "tabular-nums" }}>{t.count}</span>}
          </button>
        ))}
      </div>
      {right && <div style={{ display: "flex", gap: 8 }}>{right}</div>}
    </div>
  );
}

export function Kbd({ children, style = {} }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 18, height: 18, padding: "0 4px",
      fontSize: 10, fontFamily: "var(--mono)",
      color: "var(--text-3)",
      border: "1px solid var(--line)", borderRadius: 3,
      background: "var(--surface)",
      ...style,
    }}>{children}</span>
  );
}

export function EmptyState({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ width: 64, borderTop: "1px solid var(--line)", margin: "0 0 14px" }}/>
      <div style={{ fontFamily: "var(--serif)", fontSize: 26, letterSpacing: "-0.01em" }}>{title}</div>
      {hint && <div style={{ color: "var(--text-3)", maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}>{hint}</div>}
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow, title, sub, actions, tabs, activeTab, onTab,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  tabs?: { id: string; label: ReactNode; count?: number }[];
  activeTab?: string;
  onTab?: (id: string) => void;
}) {
  return (
    <div>
      <div style={{ padding: "20px 28px 18px", borderBottom: "1px solid var(--line)" }}>
        {eyebrow && <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>{eyebrow}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: 36, margin: 0, fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1.1 }}>{title}</h1>
            {sub && <div style={{ color: "var(--text-3)", marginTop: 8, fontSize: 13 }}>{sub}</div>}
          </div>
          {actions && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div>}
        </div>
      </div>
      {tabs && activeTab && onTab && <div style={{ padding: "0 28px" }}><Tabs tabs={tabs} active={activeTab} onChange={onTab}/></div>}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button onClick={() => onChange(!on)} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span style={{
        width: 28, height: 16, borderRadius: 99,
        background: on ? "var(--signal)" : "var(--surface-3)",
        border: "1px solid var(--line)",
        position: "relative", transition: "background .15s",
        display: "inline-block",
      }}>
        <span style={{ position: "absolute", top: 1, left: on ? 13 : 1, width: 12, height: 12, borderRadius: 99, background: "var(--text)", transition: "left .15s" }}/>
      </span>
      {label && <span style={{ fontSize: 13, color: "var(--text-2)" }}>{label}</span>}
    </button>
  );
}

export function Segmented<T extends string>({
  options, value, onChange, size = "md",
}: {
  options: { label: ReactNode; value: T }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 4, padding: 2, background: "var(--surface)" }}>
      {options.map(o => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          style={{
            padding: size === "sm" ? "2px 10px" : "4px 12px",
            fontSize: size === "sm" ? 11 : 12,
            color: value === o.value ? "var(--text)" : "var(--text-3)",
            background: value === o.value ? "var(--surface-2)" : "transparent",
            borderRadius: 3,
            transition: "background .1s, color .1s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
