import os from "node:os";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";
import { errorResponse, ok } from "@/lib/api";

const exec = promisify(execCb);

async function firstLine(path: string): Promise<string | null> {
  try { return (await fs.readFile(path, "utf8")).split("\n")[0] ?? null; } catch { return null; }
}

async function osRelease(): Promise<string | null> {
  try {
    const content = await fs.readFile("/etc/os-release", "utf8");
    const m = content.match(/PRETTY_NAME="?([^"\n]+)"?/);
    return m?.[1] ?? null;
  } catch { return null; }
}

async function publicIp(): Promise<string | null> {
  try {
    const { stdout } = await exec("curl -fsS --max-time 3 https://ipv4.icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}'");
    return stdout.trim() || null;
  } catch { return null; }
}

export async function GET() {
  try {
    const [osName, cpuModel, ip] = await Promise.all([
      osRelease(),
      firstLine("/proc/cpuinfo").then((l) => l?.includes("model name") ? l.split(":")[1]?.trim() ?? null : null),
      publicIp(),
    ]);
    const cpus = os.cpus();
    return ok({
      hostname: os.hostname(),
      kernel: `${os.type()} ${os.release()}`,
      os: osName ?? `${os.platform()} ${os.release()}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cpu: cpuModel ? `${cpuModel} · ${cpus.length} vCPU` : `${cpus[0]?.model ?? "unknown"} · ${cpus.length} vCPU`,
      ramGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      publicIp: ip,
      platform: process.platform,
      nodeVersion: process.version,
    });
  } catch (e) { return errorResponse(e); }
}
