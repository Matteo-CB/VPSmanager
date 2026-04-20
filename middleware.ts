import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/api/auth",
  "/robots.txt",
  "/favicon.ico",
];

const PUBLIC_PREFIXES = [
  "/_next",
  "/fonts",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublic) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
    return res;
  }

  const hasSession =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!hasSession) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: { code: "auth.required", message: "Authentication required" } }, { status: 401 });
    }

    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost";
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return NextResponse.redirect(`${proto}://${host}/login`);
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
