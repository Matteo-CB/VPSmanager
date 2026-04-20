
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";

const exec = promisify(execCb);
const isLinux = process.platform === "linux";

export async function systemctl(action: "start" | "stop" | "restart" | "reload" | "status", unit: string): Promise<{ ok: boolean; output: string }> {
  if (!isLinux) {
    return { ok: false, output: `stub: would run 'systemctl ${action} ${unit}' on Linux` };
  }
  try {
    const { stdout, stderr } = await exec(`sudo systemctl ${action} ${unit}`, { timeout: 10_000 });
    return { ok: true, output: stdout || stderr };
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  }
}

export async function journalctl(unit: string, lines = 200): Promise<string[]> {
  if (!isLinux) return [];
  try {
    const { stdout } = await exec(`journalctl -u ${unit} -n ${lines} --no-pager -o short-iso`, { timeout: 5_000 });
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
