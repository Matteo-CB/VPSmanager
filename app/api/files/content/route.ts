import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { errorResponse, ok, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";

const ALLOWED_ROOTS = ["/opt/sites", "/opt/vps-manager", "/var/www", "/var/log", "/etc/nginx", "/etc/systemd/system", "/srv"];
function isAllowed(p: string): boolean {
  const norm = path.resolve(p);
  return ALLOWED_ROOTS.some((r) => norm === r || norm.startsWith(r + "/"));
}

const SENSITIVE = /\.env(\.|$)/i;

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const p = req.nextUrl.searchParams.get("path");
    if (!p) throw new ApiError("fs.path_required", "path required", 400);
    if (!isAllowed(p)) throw new ApiError("fs.forbidden", "Path not allowed", 403);
    const stat = await fs.stat(p).catch(() => null);
    if (!stat || !stat.isFile()) throw new ApiError("fs.not_found", "File not found", 404);
    if (stat.size > 1_000_000) throw new ApiError("fs.too_large", "File > 1MB", 413);
    let content = await fs.readFile(p, "utf8");
    if (SENSITIVE.test(path.basename(p))) {
      content = content.split("\n").map((l) => {
        const eq = l.indexOf("=");
        if (eq === -1) return l;
        const key = l.slice(0, eq);
        return `${key}=${"•".repeat(Math.max(4, l.length - eq - 1))}`;
      }).join("\n");
    }
    return ok({ path: p, size: stat.size, content });
  } catch (e) { return errorResponse(e); }
}
