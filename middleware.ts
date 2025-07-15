import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // List of public paths that don't require authentication
  const publicPaths = ["/login", "/register", "/api/login", "/api/register"];
  const { pathname } = request.nextUrl;

  // If the user is on a public path, allow
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for auth token (example: cookie named 'token')
  const token = request.cookies.get("token");

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/login|api/register).*)",
  ],
};
