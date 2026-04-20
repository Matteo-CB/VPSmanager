import { errorResponse, ok, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { listRepos, getGithubTokenFor, latestCommit } from "@/lib/github";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const token = await getGithubTokenFor(user.id);
    if (!token) throw new ApiError("github.not_connected", "Connecte ton GitHub d'abord", 400);

    const repos = await listRepos(token);
    const onlyMine = req.nextUrl.searchParams.get("owned") === "1";
    const filtered = onlyMine ? repos.filter((r) => r.full_name.startsWith(user.email.split("@")[0] + "/")) : repos;

    return ok({
      data: filtered.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        name: r.name,
        private: r.private,
        description: r.description,
        defaultBranch: r.default_branch,
        sshUrl: r.ssh_url,
        pushedAt: r.pushed_at,
        language: r.language,
      })),
    });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const token = await getGithubTokenFor(user.id);
    if (!token) throw new ApiError("github.not_connected", "Connecte ton GitHub d'abord", 400);
    const body = await req.json();
    const fullName = String(body.fullName ?? "");
    const branch = String(body.branch ?? "main");
    if (!fullName) throw new ApiError("github.invalid", "fullName required", 400);
    const c = await latestCommit(token, fullName, branch);
    return ok({ commit: c });
  } catch (e) { return errorResponse(e); }
}
