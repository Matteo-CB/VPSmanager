"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "./client-api";

export type Site = {
  id: string; slug: string; name: string; framework: string; runtime: string;
  status: string; domain: string; deploys: number; branch: string; lastDeploy: string;
  cpu: number; mem: number;
};

export type Deployment = {
  id: string; site: string; slug: string; commit: string; msg: string; author: string;
  branch: string; target: string; status: string; duration: string; when: string;
};

export type Incident = { id: string; sev: string; msg: string; when: string; open: boolean };
export type LogLine = { t: string; src: string; lvl: string; msg: string };
export type Service = { name: string; kind: string; state: string; uptime: string; cpu: number; mem: number; site: string | null };
export type Database = { id: string; name: string; engine: string; version: string | null; size: string; connections: number };
export type DnsRecord = { id?: string; type: string; name: string; content: string; ttl: number; proxied?: boolean; priority?: number | null };
export type DnsZone = { id: string; domain: string; provider: string; records: number };
export type FirewallRule = { id: string; action: string; port: string; proto: string; src: string; c: string };
export type SettingsUser = { id: string; email: string; name: string; initials: string; role: string; twofa: boolean; lastLoginAt: string | null };

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<{ user: { id: string; email: string; name: string | null; initials: string | null; role: "ADMIN" | "USER" } }>("/api/me"),
    staleTime: 60_000,
  });
}

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: () => apiGet<{ data: Site[] }>("/api/sites").then((r) => r.data),
    staleTime: 10_000,
  });
}

export function useSite(slug: string | undefined) {
  return useQuery({
    enabled: !!slug,
    queryKey: ["site", slug],
    queryFn: () => apiGet<{ site: unknown }>(`/api/sites/${slug}`).then((r) => r.site),
  });
}

export function useDeployments() {
  return useQuery({
    queryKey: ["deployments"],
    queryFn: () => apiGet<{ data: Deployment[] }>("/api/deployments").then((r) => r.data),
    staleTime: 10_000,
  });
}

export function useSystemOverview() {
  return useQuery({
    queryKey: ["system", "overview"],
    queryFn: () => apiGet<{
      hostname: string; kernel: string; uptime: string; uptimeSeconds: number;
      cpu: { count: number; usage: number; load: [number, number, number] };
      memory: { totalMb: number; usedMb: number; freeMb: number; usedPercent: number };
      disks: { mount: string; totalGb: number; usedGb: number; fs: string }[];
      platform: string;
    }>("/api/system/overview"),
    refetchInterval: 4_000,
  });
}

export function useLogs(opts: { source?: string; level?: string; q?: string; site?: string } = {}) {
  const qs = new URLSearchParams();
  if (opts.source) qs.set("source", opts.source);
  if (opts.level) qs.set("level", opts.level);
  if (opts.q) qs.set("q", opts.q);
  if (opts.site) qs.set("site", opts.site);
  return useQuery({
    queryKey: ["logs", opts],
    queryFn: () => apiGet<{ data: LogLine[] }>(`/api/logs?${qs.toString()}`).then((r) => r.data),
    refetchInterval: 3_000,
  });
}

export function useServices(kind?: string) {
  return useQuery({
    queryKey: ["services", kind ?? "all"],
    queryFn: () => apiGet<{ data: Service[] }>(`/api/services${kind && kind !== "all" ? `?kind=${kind}` : ""}`).then((r) => r.data),
  });
}

export function useDatabases() {
  return useQuery({
    queryKey: ["databases"],
    queryFn: () => apiGet<{ data: Database[] }>("/api/databases").then((r) => r.data),
  });
}

export function useDatabaseTables(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["db", "tables", id],
    queryFn: () => apiGet<{ data: { name: string; rows: number; size: string; idx: number }[]; note?: string }>(`/api/databases/${id}/tables`),
  });
}

export function useDatabaseDumps(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["db", "dumps", id],
    queryFn: () => apiGet<{ data: { id: string; t: string; size: string; kind: string; status: string }[] }>(`/api/databases/${id}/dumps`).then((r) => r.data),
  });
}

export function useIncidents() {
  return useQuery({
    queryKey: ["incidents"],
    queryFn: () => apiGet<{ data: Incident[] }>("/api/incidents").then((r) => r.data),
  });
}

export function useDnsZones() {
  return useQuery({
    queryKey: ["dns", "zones"],
    queryFn: () => apiGet<{ data: DnsZone[] }>("/api/dns/zones").then((r) => r.data),
  });
}

export function useDnsRecords(domain: string | undefined) {
  return useQuery({
    enabled: !!domain,
    queryKey: ["dns", "records", domain],
    queryFn: () => apiGet<{ zone: { records: DnsRecord[] } | null }>(`/api/dns?domain=${domain}`).then((r) => r.zone?.records ?? []),
  });
}

export function useDnsChecks(domain: string | undefined) {
  return useQuery({
    enabled: !!domain,
    queryKey: ["dns", "checks", domain],
    queryFn: () => apiGet<{ data: { label: string; expected: string; seen: string; ok: boolean }[] }>(`/api/dns/checks?domain=${domain}`).then((r) => r.data),
  });
}

export function useFirewall() {
  return useQuery({
    queryKey: ["firewall"],
    queryFn: () => apiGet<{ data: FirewallRule[] }>("/api/firewall").then((r) => r.data),
  });
}

export function useFail2ban() {
  return useQuery({
    queryKey: ["fail2ban"],
    queryFn: () => apiGet<{ installed: boolean; jails: number; bans24h: number; banned: number }>("/api/settings/fail2ban"),
  });
}

export function useBackupPolicy() {
  return useQuery({
    queryKey: ["backup-policy"],
    queryFn: () => apiGet<{ schedule: string | null; retention: string | null; destination: string | null; encryption: string | null }>("/api/settings/backup-policy"),
  });
}

export function useSettingsUsers() {
  return useQuery({
    queryKey: ["settings", "users"],
    queryFn: () => apiGet<{ data: SettingsUser[] }>("/api/settings/users").then((r) => r.data),
  });
}

export function useApiTokens() {
  return useQuery({
    queryKey: ["api-tokens"],
    queryFn: () => apiGet<{ data: { id: string; name: string; keyPreview: string; lastUsedAt: string | null }[] }>("/api/settings/api-tokens").then((r) => r.data),
  });
}

export function useMachineInfo() {
  return useQuery({
    queryKey: ["machine"],
    queryFn: () => apiGet<{
      hostname: string; kernel: string; os: string; timezone: string;
      cpu: string; ramGb: number; publicIp: string | null; platform: string; nodeVersion: string;
    }>("/api/settings/machine"),
  });
}

export type AnalyticsResp = {
  overall: {
    totalDeploys: number; deploys30d: number; ready30d: number; failed30d: number;
    successRate: number | null; avgDurationMs: number | null;
    activeSites: number; totalSites: number;
  };
  deploysPerDay: { date: string; ready: number; failed: number; other: number }[];
  topSites: { slug: string; name: string; domain: string | null; count: number; lastAt: string | null }[];
  services: { running: number; failed: number; stopped: number; total: number };
  sslExpiringSoon: { hostname: string; expiresAt: string; daysLeft: number; status: string }[];
  logsBySource24h: { source: string; count: number }[];
};

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: () => apiGet<AnalyticsResp>("/api/analytics"),
    refetchInterval: 30_000,
  });
}

export function useTerminalExec() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cmd: string) => apiPost<{ stdout: string; stderr: string; cmd: string; error?: boolean }>("/api/terminal/exec", { cmd }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["logs"] }),
  });
}
