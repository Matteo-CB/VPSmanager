import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

const createSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  framework: z.string(),
  runtime: z.string(),
  productionBranch: z.string().default("main"),
});

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q")?.toLowerCase();

    const sites = await prisma.site.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
      },
      include: { deployments: { orderBy: { queuedAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
    });

    const filtered = q
      ? sites.filter((s) => (s.name + (s.domainPrimary ?? "")).toLowerCase().includes(q))
      : sites;

    return ok({ data: filtered.map((s) => ({
      id: s.id, slug: s.slug, name: s.name, framework: s.framework, runtime: s.runtime,
      status: s.status, domain: s.domainPrimary ?? "", deploys: s.deployCount, branch: s.productionBranch,
      lastDeploy: s.lastDeployAt ? relativeTime(s.lastDeployAt) : "·",
      cpu: s.cpuUsage, mem: s.memUsage,
    })) });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = createSchema.parse(body);
    const site = await prisma.site.create({
      data: {
        slug: input.slug,
        name: input.name,
        framework: input.framework as never,
        runtime: input.runtime as never,
        productionBranch: input.productionBranch,
      },
    });
    return ok({ site }, { status: 201 });
  } catch (e) { return errorResponse(e); }
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "il y a quelques secondes";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}
