import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { getGithubTokenFor, latestCommit } from "@/lib/github";
import { deploy } from "@/lib/site-deployer";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireAdmin();
    const { slug } = await params;
    const site = await prisma.site.findUnique({ where: { slug }, include: { domains: true, gitRepo: true } });
    if (!site) throw new ApiError("site.not_found", "Site not found", 404);
    if (!site.gitRepo) throw new ApiError("site.no_repo", "Ce site n'a pas de repo GitHub connecté", 400);
    if (!site.port && site.runtime !== "STATIC") throw new ApiError("site.no_port", "Port absent", 400);

    const token = await getGithubTokenFor(user.id);
    if (!token) throw new ApiError("github.not_connected", "Connecte ton GitHub d'abord", 400);

    const repoFullName = `${site.gitRepo.owner}/${site.gitRepo.repo}`;
    const branch = site.gitRepo.defaultBranch;
    const hostnames = [
      ...site.domains.filter((d) => d.isPrimary).map((d) => d.hostname),
      ...site.domains.filter((d) => !d.isPrimary).map((d) => d.hostname),
    ];
    if (hostnames.length === 0 && site.domainPrimary) hostnames.push(site.domainPrimary);

    const commit = await latestCommit(token, repoFullName, branch).catch(() => null);

    const deployment = await prisma.deployment.create({
      data: {
        siteId: site.id,
        target: "PRODUCTION" as never,
        status: "QUEUED" as never,
        commitSha: commit?.sha ?? "pending",
        commitMessage: commit?.message ?? "Redeploy",
        commitAuthor: commit?.author ?? user.email,
        branch,
        trigger: "ui.redeploy",
        triggeredById: user.id,
      },
    });

    await prisma.site.update({ where: { id: site.id }, data: { status: "BUILDING" as never } });

    void deploy({
      slug: site.slug,
      name: site.name,
      repoFullName,
      branch,
      hostnames,
      port: site.port ?? 3010,
      email: user.email,
      githubToken: token,
      framework: site.framework,
      runtime: site.runtime,
    }, deployment.id).then(async () => {
      await prisma.site.update({ where: { id: site.id }, data: { status: "ACTIVE" as never, lastDeployAt: new Date(), deployCount: { increment: 1 } } });
    }).catch(async () => {
      await prisma.site.update({ where: { id: site.id }, data: { status: "FAILED" as never } });
    });

    return ok({ deploymentId: deployment.id }, { status: 202 });
  } catch (e) { return errorResponse(e); }
}
