import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";
import { requireUser, requireAdmin } from "@/lib/rbac";
import { randomToken, sha256 } from "@/lib/crypto";

export async function GET() {
  try {
    const u = await requireUser();
    const tokens = await prisma.apiToken.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, tokenHash: true, lastUsedAt: true, expiresAt: true, scopes: true, createdAt: true },
    });
    return ok({
      data: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        keyPreview: `vpsm_${"•".repeat(12)}${t.tokenHash.slice(-4)}`,
        lastUsedAt: t.lastUsedAt,
        expiresAt: t.expiresAt,
        scopes: t.scopes,
      })),
    });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const u = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const name = (body.name as string | undefined)?.trim();
    if (!name) return errorResponse(new Error("name required"));
    const token = `vpsm_${randomToken(24)}`;
    const hash = sha256(token);
    const row = await prisma.apiToken.create({
      data: { userId: u.id, name, tokenHash: hash, scopes: body.scopes ?? [] },
    });

    return ok({ id: row.id, token, name }, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
