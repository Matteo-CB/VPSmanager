import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) return errorResponse(new Error("unauthenticated"));
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true, initials: true, role: true, totpEnabled: true, preferences: true, lastLoginAt: true },
    });
    return ok({ user });
  } catch (e) { return errorResponse(e); }
}
