import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { encrypt } from "@/lib/crypto";
import { getUser } from "@/lib/github";
import { hasSecretsKey } from "@/lib/env";

export async function GET() {
  try {
    const user = await requireAdmin();
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { githubLogin: true, githubTokenEnc: true } });
    return ok({
      connected: !!row?.githubTokenEnc,
      login: row?.githubLogin ?? null,
    });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!hasSecretsKey) throw new ApiError("crypto.missing", "SECRETS_MASTER_KEY not set", 500);
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    if (!token || (!token.startsWith("ghp_") && !token.startsWith("github_pat_") && !token.startsWith("gho_"))) {
      throw new ApiError("github.invalid_token", "Token should start with ghp_, github_pat_ or gho_", 400);
    }

    const gh = await getUser(token).catch(() => null);
    if (!gh) throw new ApiError("github.invalid_token", "GitHub rejected this token", 401);

    const enc = encrypt(token, `github:${user.id}`);
    await prisma.user.update({
      where: { id: user.id },
      data: { githubTokenEnc: enc, githubLogin: gh.login },
    });
    return ok({ login: gh.login, name: gh.name });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE() {
  try {
    const user = await requireAdmin();
    await prisma.user.update({ where: { id: user.id }, data: { githubTokenEnc: null, githubLogin: null } });
    return ok({ disconnected: true });
  } catch (e) { return errorResponse(e); }
}

