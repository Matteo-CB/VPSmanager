import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";
import { requireUser, requireAdmin } from "@/lib/rbac";
import { decrypt, encrypt } from "@/lib/crypto";
import { hasSecretsKey } from "@/lib/env";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireUser();
    const { slug } = await params;
    const site = await prisma.site.findUnique({ where: { slug }, include: { envGroups: { include: { variables: true } } } });
    if (!site) throw new ApiError("site.not_found", "Site not found", 404);
    const isAdmin = user.role === "ADMIN";
    const data = site.envGroups.flatMap((g) =>
      g.variables.map((v) => ({
        id: v.id,
        key: v.key,
        scope: v.scope,
        sensitive: v.sensitive,

        masked: v.sensitive ? `${"•".repeat(Math.max(4, v.valueEnc.length > 10 ? 10 : 6))}` : tryMaskedPreview(v.valueEnc, v.sensitive),
        canReveal: isAdmin && hasSecretsKey,
      }))
    );
    return ok({ data });
  } catch (e) { return errorResponse(e); }
}

function tryMaskedPreview(stored: string, sensitive: boolean): string {
  if (sensitive) return "•".repeat(8);

  return stored.length > 40 ? stored.slice(0, 37) + "…" : stored;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await requireAdmin();
    const { slug } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    if (action === "reveal") {
      const id = body.id as string;
      const v = await prisma.envVariable.findUnique({ where: { id }, include: { group: { include: { site: true } } } });
      if (!v || v.group.site?.slug !== slug) throw new ApiError("env.not_found", "Variable not found", 404);
      let value = v.valueEnc;
      if (v.sensitive && hasSecretsKey) {
        try { value = decrypt(v.valueEnc, `${v.groupId}:${v.key}`); } catch {  }
      }
      await prisma.activityLog.create({
        data: { userId: user.id, action: "env.reveal", targetKind: "envVariable", targetId: id, payload: { key: v.key } },
      });
      return ok({ id, key: v.key, value });
    }
    if (action === "set") {
      const groupId = body.groupId as string;
      const key = body.key as string;
      const value = body.value as string;
      const scope = (body.scope as string) ?? "ALL";
      const enc = hasSecretsKey ? encrypt(value, `${groupId}:${key}`) : value;
      const row = await prisma.envVariable.upsert({
        where: { groupId_key_scope: { groupId, key, scope: scope as never } },
        update: { valueEnc: enc },
        create: { groupId, key, valueEnc: enc, scope: scope as never },
      });
      await prisma.activityLog.create({
        data: { userId: user.id, action: "env.set", targetKind: "envVariable", targetId: row.id, payload: { key } },
      });
      return ok({ id: row.id });
    }
    throw new ApiError("env.unknown_action", "Unknown action", 400);
  } catch (e) { return errorResponse(e); }
}
