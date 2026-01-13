// src/proxy.js
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function proxy(req) {
  const { pathname, searchParams } = req.nextUrl;

  // Only guard /admin routes (allow auth pages)
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute =
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/admin/register") ||
    pathname.startsWith("/admin/auth");

  if (!isAdminRoute || isAuthRoute) return NextResponse.next();

  // Create response FIRST so supabase can set cookies into it
  const res = NextResponse.next();
  const supabase = createSupabaseServerClient(req, res);

  // IMPORTANT: getUser() validates the JWT on the server (more reliable than getSession)
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";

    const next = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    loginUrl.searchParams.set("next", next);

    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
