import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

const exec = promisify(execCb);
const isLinux = process.platform === "linux";

async function tryExec(cmd: string): Promise<string | null> {
  if (!isLinux) return null;
  try {
    const { stdout } = await exec(cmd, { timeout: 4000 });
    return stdout;
  } catch { return null; }
}

export async function GET() {
  try {
    const active = (await tryExec("systemctl is-active fail2ban")) ?? "";
    const installed = active.trim() === "active";

    let jails = 0, bans24h = 0, banned = 0;
    if (installed) {
      const status = await tryExec("fail2ban-client status 2>/dev/null");
      const jm = status?.match(/Jail list:\s*(.+)/);
      const jailNames = jm?.[1].split(",").map((s) => s.trim()).filter(Boolean) ?? [];
      jails = jailNames.length;
      for (const j of jailNames) {
        const s = await tryExec(`fail2ban-client status ${j} 2>/dev/null`);
        const cur = s?.match(/Currently banned:\s*(\d+)/);
        const tot = s?.match(/Total banned:\s*(\d+)/);
        if (cur) banned += Number(cur[1]);
        if (tot) bans24h += Number(tot[1]);
      }
    } else {

      banned = await prisma.bannedIp.count({ where: { permanent: false } });
    }

    return ok({ installed, jails, bans24h, banned });
  } catch (e) { return errorResponse(e); }
}
