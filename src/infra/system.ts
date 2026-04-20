

import os from "node:os";
import fs from "node:fs/promises";

export type SystemOverview = {
  hostname: string;
  kernel: string;
  uptimeSeconds: number;
  cpuCount: number;
  cpuUsagePercent: number;
  loadAvg: [number, number, number];
  memTotalMb: number;
  memUsedMb: number;
  memFreeMb: number;
  disks: { mount: string; totalGb: number; usedGb: number; fs: string }[];
  netInKbps: number;
  netOutKbps: number;
};

const isLinux = process.platform === "linux";

async function readCpuUsage(): Promise<number> {
  if (!isLinux) {

    const load = os.loadavg()[0] ?? 0;
    return Math.min(100, (load / os.cpus().length) * 100);
  }
  try {
    const stat = await fs.readFile("/proc/stat", "utf8");
    const line = stat.split("\n")[0] ?? "";
    const fields = line.trim().split(/\s+/).slice(1).map(Number);
    const [user = 0, nice = 0, system = 0, idle = 0, iowait = 0] = fields;
    const busy = user + nice + system;
    const total = busy + idle + iowait;
    return total > 0 ? (busy / total) * 100 : 0;
  } catch {
    return 0;
  }
}

async function readDisks(): Promise<SystemOverview["disks"]> {
  if (!isLinux) {

    return [{ mount: "/", totalGb: 0, usedGb: 0, fs: "unknown" }];
  }
  try {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);
    const { stdout } = await execAsync("df -P -B1");
    const lines = stdout.trim().split("\n").slice(1);
    return lines
      .map((l) => l.trim().split(/\s+/))
      .filter((f) => f[5] && !f[5].startsWith("/proc") && !f[5].startsWith("/sys"))
      .map((f) => ({
        mount: f[5] ?? "/",
        totalGb: Math.round(Number(f[1] ?? 0) / 1e9 * 10) / 10,
        usedGb: Math.round(Number(f[2] ?? 0) / 1e9 * 10) / 10,
        fs: f[0] ?? "unknown",
      }))
      .slice(0, 5);
  } catch {
    return [];
  }
}

export async function getSystemOverview(): Promise<SystemOverview> {
  const [cpuUsage, disks] = await Promise.all([readCpuUsage(), readDisks()]);
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  return {
    hostname: os.hostname(),
    kernel: `${os.type()} ${os.release()}`,
    uptimeSeconds: os.uptime(),
    cpuCount: os.cpus().length,
    cpuUsagePercent: Math.round(cpuUsage * 10) / 10,
    loadAvg: os.loadavg() as [number, number, number],
    memTotalMb: Math.round(memTotal / 1024 / 1024),
    memUsedMb: Math.round((memTotal - memFree) / 1024 / 1024),
    memFreeMb: Math.round(memFree / 1024 / 1024),
    disks,
    netInKbps: 0,
    netOutKbps: 0,
  };
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}
