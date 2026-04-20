import { NextRequest } from "next/server";
import dns from "node:dns/promises";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { getGithubTokenFor } from "@/lib/github";
import { allocatePort, deploy } from "@/lib/site-deployer";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const token = await getGithubTokenFor(user.id);
    if (!token) throw new ApiError("github.not_connected", "Connecte ton GitHub d'abord", 400);

    const body = await req.json();
    const repoFullName = String(body.repoFullName ?? "").trim();
    const branch = String(body.branch ?? "main").trim();
    const mode = String(body.mode ?? "subdomain");
    const domain = String(body.domain ?? "").trim().toLowerCase();
    const framework = (String(body.framework ?? "NEXTJS") as "NEXTJS" | "STATIC" | "ASTRO" | "CUSTOM");

    if (!/^[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(repoFullName)) throw new ApiError("invalid", "repoFullName invalide", 400);
    if (!/^[a-z0-9.-]+$/i.test(domain)) throw new ApiError("invalid", "domain invalide", 400);

    const rawSlug = repoFullName.split("/")[1].toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const existing = await prisma.site.findUnique({ where: { slug: rawSlug } });
    const slug = existing ? `${rawSlug}-${Math.random().toString(36).slice(2, 6)}` : rawSlug;

    const vpsIp = await getVpsPublicIp();
    const hostnames: string[] = [];
    if (mode === "subdomain") {
      if (!domain.includes(".")) throw new ApiError("invalid", "Pour un sous-domaine, fournis le FQDN complet (ex: app.hiddenlab.fr)", 400);
      hostnames.push(domain);
    } else {
      hostnames.push(domain);
      if (!domain.startsWith("www.")) hostnames.push(`www.${domain}`);
    }

    for (const h of hostnames) {
      try {
        const ips = await dns.resolve4(h);
        if (vpsIp && !ips.includes(vpsIp)) {
          throw new ApiError("dns.mismatch", `${h} résout ${ips.join(",")} au lieu de ${vpsIp}. Ajoute l'enregistrement A avant de déployer.`, 400);
        }
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("dns.unresolved", `${h} n'a pas de record A public. Ajoute-le chez ton registrar avant de déployer.`, 400);
      }
    }

    const port = await allocatePort();

    const site = await prisma.site.create({
      data: {
        slug,
        name: body.name?.toString().trim() || repoFullName.split("/")[1],
        framework: framework as never,
        runtime: (framework === "STATIC" ? "STATIC" : "NODE") as never,
        status: "CREATING" as never,
        port,
        productionBranch: branch,
        domainPrimary: hostnames[0],
        installCommand: "pnpm install --frozen-lockfile",
        buildCommand: framework === "STATIC" ? null : "pnpm build",
        startCommand: framework === "STATIC" ? null : "pnpm start",
        nodeVersion: "20.x",
        packageManager: "pnpm",
        gitRepo: {
          create: {
            provider: "github",
            owner: repoFullName.split("/")[0],
            repo: repoFullName.split("/")[1],
            defaultBranch: branch,
            authType: "pat",
          },
        },
      },
    });

    for (const [i, h] of hostnames.entries()) {
      await prisma.domain.create({
        data: {
          siteId: site.id,
          hostname: h,
          kind: (h.split(".").length > 2 ? "SUBDOMAIN" : "APEX") as never,
          isPrimary: i === 0,
        },
      });
    }

    const deployment = await prisma.deployment.create({
      data: {
        siteId: site.id,
        target: "PRODUCTION" as never,
        status: "QUEUED" as never,
        commitSha: "pending",
        commitMessage: "Initial deploy",
        commitAuthor: user.email,
        branch,
        trigger: "ui.create",
        triggeredById: user.id,
      },
    });

    void deploy({
      slug,
      name: site.name,
      repoFullName,
      branch,
      hostnames,
      port,
      email: user.email,
      githubToken: token,
      framework,
      runtime: site.runtime,
    }, deployment.id).then(async () => {
      await prisma.site.update({ where: { id: site.id }, data: { status: "ACTIVE" as never, lastDeployAt: new Date(), deployCount: { increment: 1 } } });
    }).catch(async () => {
      await prisma.site.update({ where: { id: site.id }, data: { status: "FAILED" as never } });
    });

    return ok({ siteId: site.id, slug, deploymentId: deployment.id }, { status: 202 });
  } catch (e) { return errorResponse(e); }
}

async function getVpsPublicIp(): Promise<string | null> {
  try {

    const url = env.NEXTAUTH_URL;
    if (url) {
      const host = new URL(url).hostname;
      const ips = await dns.resolve4(host);
      if (ips[0]) return ips[0];
    }
  } catch {}
  try {
    const res = await fetch("https://ipv4.icanhazip.com", { signal: AbortSignal.timeout(2000) });
    const txt = (await res.text()).trim();
    if (/^\d+\.\d+\.\d+\.\d+$/.test(txt)) return txt;
  } catch {}
  return null;
}
