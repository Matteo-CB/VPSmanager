
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";

const exec = promisify(execCb);

export type ContainerInfo = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
};

export async function listContainers(): Promise<ContainerInfo[]> {
  try {
    const { stdout } = await exec('docker ps -a --format "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.State}}\t{{.Status}}"', { timeout: 5_000 });
    return stdout.trim().split("\n").filter(Boolean).map((line) => {
      const [id, name, image, state, status] = line.split("\t");
      return { id: id ?? "", name: name ?? "", image: image ?? "", state: state ?? "", status: status ?? "" };
    });
  } catch {
    return [];
  }
}

export async function dockerAction(id: string, action: "start" | "stop" | "restart" | "kill"): Promise<{ ok: boolean; output: string }> {
  try {
    const { stdout, stderr } = await exec(`docker ${action} ${id}`, { timeout: 10_000 });
    return { ok: true, output: stdout + stderr };
  } catch (e) {
    return { ok: false, output: e instanceof Error ? e.message : String(e) };
  }
}

export async function dockerLogs(id: string, tail = 200): Promise<string[]> {
  try {
    const { stdout } = await exec(`docker logs --tail ${tail} ${id} 2>&1`, { timeout: 5_000 });
    return stdout.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
