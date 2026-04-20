
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";
import fs from "node:fs/promises";

const exec = promisify(execCb);
const isLinux = process.platform === "linux";

export async function nginxTest(): Promise<{ ok: boolean; output: string }> {
  if (!isLinux) return { ok: false, output: "stub (non-Linux)" };
  try {
    const { stdout, stderr } = await exec("sudo nginx -t", { timeout: 5_000 });
    return { ok: true, output: stdout + stderr };
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  }
}

export async function nginxReload(): Promise<{ ok: boolean; output: string }> {
  if (!isLinux) return { ok: false, output: "stub (non-Linux)" };
  try {
    const test = await nginxTest();
    if (!test.ok) return test;
    const { stdout, stderr } = await exec("sudo systemctl reload nginx", { timeout: 5_000 });
    return { ok: true, output: stdout + stderr };
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  }
}

export async function writeVhost(slug: string, config: string): Promise<{ ok: boolean; path: string }> {
  const path = `/etc/nginx/sites-available/vps-site-${slug}.conf`;
  if (!isLinux) return { ok: false, path: "stub (non-Linux)" };
  await fs.writeFile(path, config, "utf8");
  return { ok: true, path };
}
