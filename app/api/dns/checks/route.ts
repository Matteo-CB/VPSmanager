import { NextRequest } from "next/server";
import dns from "node:dns/promises";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";

async function resolveSafe(name: string, type: "A" | "AAAA" | "CNAME" | "MX" | "TXT"): Promise<string[]> {
  try {
    switch (type) {
      case "A":    return await dns.resolve4(name);
      case "AAAA": return await dns.resolve6(name);
      case "CNAME":return await dns.resolveCname(name);
      case "MX":   return (await dns.resolveMx(name)).map((m) => `${m.exchange} (${m.priority})`);
      case "TXT":  return (await dns.resolveTxt(name)).map((chunks) => chunks.join(""));
    }
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  try {
    const domain = req.nextUrl.searchParams.get("domain");
    if (!domain) throw new ApiError("dns.domain_required", "domain required", 400);
    const zone = await prisma.dnsZone.findUnique({ where: { domain }, include: { records: true } });
    if (!zone) throw new ApiError("dns.zone_not_found", "Zone not found", 404);

    const checks: { label: string; expected: string; seen: string; ok: boolean }[] = [];
    for (const r of zone.records) {
      if (!["A", "AAAA", "CNAME", "MX", "TXT"].includes(r.type)) continue;
      const name = r.name === "@" ? domain : `${r.name}.${domain}`;
      const resolved = await resolveSafe(name, r.type as "A");
      const seen = resolved[0] ?? "·";
      const ok = resolved.some((v) => v.includes(r.content.split(" ")[0]));
      checks.push({
        label: `${r.type} ${r.name === "@" ? "@" : r.name}`,
        expected: r.content,
        seen,
        ok,
      });
    }
    return ok({ data: checks });
  } catch (e) { return errorResponse(e); }
}
