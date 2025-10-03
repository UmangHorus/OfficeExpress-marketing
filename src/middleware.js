// src/middleware.js
import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname, origin } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const isEmployee = request.cookies.get("isEmployee")?.value === "true";

  console.log("Middleware - Current Path:", pathname);
  console.log("Middleware - Token exists:", !!token);
  console.log("Middleware - Is employee:", isEmployee);

  const authRoutes = ["/login", "/"];
  const employeeOnlyRoutes = ["/dashboard", "/settings"];
  const protectedRoutes = ["/leads", ...employeeOnlyRoutes];

  // Special case: Don't redirect if we're in the registration flow
  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.get("step") === "register"
  ) {
    return NextResponse.next();
  }

  // 1. Redirect authenticated users away from auth pages
  if (token && authRoutes.includes(pathname)) {
    console.log("Redirecting authenticated user from auth page");
    const defaultRedirect = isEmployee ? "/dashboard" : "/leads";
    return NextResponse.redirect(new URL(defaultRedirect, origin));
  }

  // 2. Protect all routes - redirect to login if no token
  if (!token && protectedRoutes.some((route) => pathname.startsWith(route))) {
    console.log("Redirecting unauthenticated user to login");
    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(pathname)}`, origin)
    );
  }

  // 3. Role-based access control
  if (
    token &&
    !isEmployee &&
    employeeOnlyRoutes.some((route) => pathname.startsWith(route))
  ) {
    console.log("Redirecting non-employee from employee-only route");
    return NextResponse.redirect(new URL("/leads", origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth).*)"],
};
