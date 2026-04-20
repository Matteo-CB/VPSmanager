import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, initials: true, role: true,
        totpEnabled: true, lastLoginAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return ok({
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? u.email,
        initials: u.initials ?? (u.email.slice(0, 2).toUpperCase()),
        role: u.role,
        twofa: u.totpEnabled,
        lastLoginAt: u.lastLoginAt,
      })),
    });
  } catch (e) { return errorResponse(e); }
}
