import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/onboarding"];
const AUTH_ROUTES = ["/login", "/registro"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
