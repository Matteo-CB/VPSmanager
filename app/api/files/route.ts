import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { errorResponse, ok, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";

const ALLOWED_ROOTS = [
  "/opt/sites",
  "/opt/vps-manager",
  "/var/www",
  "/var/log",
  "/etc/nginx",
  "/etc/systemd/system",
  "/srv",
];

function isAllowed(p: string): boolean {
  const norm = path.resolve(p);
  return ALLOWED_ROOTS.some((r) => norm === r || norm.startsWith(r + path.sep) || norm.startsWith(r + "/"));
}

const SENSITIVE = new Set([".env", ".env.local", ".env.production", ".env.development", "id_rsa", "id_ed25519", "master.key"]);

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const rel = req.nextUrl.searchParams.get("path") || "/opt/sites";
    if (!isAllowed(rel)) throw new ApiError("fs.forbidden", "Path not allowed", 403);
    let stat;
    try { stat = await fs.stat(rel); } catch { throw new ApiError("fs.not_found", "Path not found", 404); }
    if (!stat.isDirectory()) throw new ApiError("fs.invalid", "Not a directory", 400);

    const entries = await fs.readdir(rel, { withFileTypes: true });
    const items = await Promise.all(entries.map(async (e) => {
      const full = path.join(rel, e.name);
      let size: number | null = null;
      let mod: Date | null = null;
      try {
        const st = await fs.stat(full);
        size = st.size;
        mod = st.mtime;
      } catch {}
      return {
        name: e.name,
        kind: e.isDirectory() ? "dir" : "file",
        size: size !== null ? humanSize(size) : "·",
        mod: mod ? mod.toISOString().slice(0, 19).replace("T", " ") : "·",
        sensitive: SENSITIVE.has(e.name) || e.name.startsWith(".env"),
      };
    }));
    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return ok({ path: rel, data: items });
  } catch (e) { return errorResponse(e); }
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
