import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import type { Role } from "@prisma/client";

export type SessionUser = { id: string; email: string; role: Role };

export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.email) throw new ApiError("auth.required", "Authentication required", 401);
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, role: true },
  });
  if (!user) throw new ApiError("user.not_found", "User not found", 404);
  return user as SessionUser;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (u.role !== "ADMIN") throw new ApiError("auth.forbidden", "Admin role required", 403);
  return u;
}

export async function requireUser(): Promise<SessionUser> {
  return getSessionUser();
}

export async function isAdmin(): Promise<boolean> {
  try {
    const u = await getSessionUser();
    return u.role === "ADMIN";
  } catch {
    return false;
  }
}
