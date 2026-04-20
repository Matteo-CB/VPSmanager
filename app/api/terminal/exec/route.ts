import { NextRequest } from "next/server";
import { promisify } from "node:util";
import { exec as execCb, execFile as execFileCb } from "node:child_process";
import { errorResponse, ok, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const exec = promisify(execCb);
const execFile = promisify(execFileCb);

const USER_ALLOWED: Record<string, string[]> = {
  uptime: [], whoami: [], pwd: [], date: [], hostname: [],
  "free": ["-h"], "df": ["-h", "-P"],
  "ls": ["-la", "-l", "-a", "-h"],
  "ps": ["-eo", "pid,user,pcpu,pmem,comm"],
  "ip": ["a", "addr", "r", "route"],
  "ss": ["-tulpn", "-tlnp"],
  "systemctl": ["status", "is-active", "is-enabled", "list-units", "--no-pager"],
  "docker": ["ps", "images", "-a", "--format"],
  "journalctl": ["-u", "-n", "--no-pager", "-o"],
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const cmd = String(body.cmd ?? "").trim();
    const cwd = typeof body.cwd === "string" && body.cwd ? body.cwd : undefined;
    if (!cmd) throw new ApiError("exec.empty", "empty command", 400);

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "terminal.exec",
        payload: { cmd, cwd: cwd ?? null, role: user.role },
      },
    }).catch(() => {});

    if (user.role === "ADMIN") {

      try {
        const { stdout, stderr } = await exec(cmd, { cwd, timeout: 30_000, maxBuffer: 8 * 1024 * 1024, shell: "/bin/bash" });
        return ok({ stdout, stderr, cmd });
      } catch (e) {
        const err = e as { code?: number; stdout?: string; stderr?: string; message?: string };
        return ok({ stdout: err.stdout ?? "", stderr: err.stderr ?? err.message ?? String(e), cmd, exitCode: err.code ?? 1, error: true });
      }
    }

    const parts = cmd.split(/\s+/);
    const bin = parts[0];
    const args = parts.slice(1);
    const allowed = USER_ALLOWED[bin];
    if (!allowed) throw new ApiError("exec.forbidden", `Command not allowed for role USER: ${bin}`, 403);
    try {
      const { stdout, stderr } = await execFile(bin, args, { timeout: 8000, maxBuffer: 2 * 1024 * 1024, cwd });
      return ok({ stdout, stderr, cmd });
    } catch (e) {
      const err = e as { code?: number | string; stdout?: string; stderr?: string; message?: string };
      return ok({ stdout: err.stdout ?? "", stderr: err.stderr ?? err.message ?? String(e), cmd, error: true });
    }
  } catch (e) {
    return errorResponse(e);
  }
}
