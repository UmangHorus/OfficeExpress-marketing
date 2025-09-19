// src/middleware.js
import { NextResponse } from "next/server";

// Commenting out old middleware logic for reference

// export function middleware(request) {
//   const { pathname, searchParams } = request.nextUrl;
//   const token = request.cookies.get("token")?.value;
//   const isEmployee = request.cookies.get("isEmployee")?.value === "true";

//   const authRoutes = ["/login", "/"];
//   const employeeOnlyRoutes = ["/dashboard", "/settings"];
//   const protectedRoutes = ["/leads", ...employeeOnlyRoutes];

//   // Special case: Don't redirect if we're in the registration flow
//   if (
//     pathname.startsWith("/login") &&
//     searchParams.get("step") === "register"
//   ) {
//     return NextResponse.next();
//   }

//   // 1. Redirect authenticated users away from login/auth pages
//   if (
//     token &&
//     authRoutes.some(
//       (route) =>
//         pathname === route ||
//         pathname === `${route}/` ||
//         pathname.startsWith(`${route}?`)
//     )
//   ) {
//     const defaultRedirect = isEmployee ? "/dashboard" : "/leads";
//     return NextResponse.redirect(new URL(defaultRedirect, request.url));
//   }

//   // 2. Protect all protected routes - redirect to login if NOT logged in
//   if (!token && protectedRoutes.some((route) => pathname.startsWith(route))) {
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   // 3. Role-based: block non-employees from employee-only routes
//   if (
//     token &&
//     !isEmployee &&
//     employeeOnlyRoutes.some((route) => pathname.startsWith(route))
//   ) {
//     return NextResponse.redirect(new URL("/leads", request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/((?!api|_next/static|_next/image|favicon.ico|auth).*)"],
// };

export function middleware(request) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host');
  
  // Skip API routes and static files
  if (url.pathname.startsWith('/_next/') || 
      url.pathname.startsWith('/api/') || 
      url.pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Extract subdomain from hostname
  const domainParts = hostname.split('.');
  let subdomain = "www"; // Default fallback
  
  if (domainParts.length > 2) {
    // For subdomains like marketing.corpteaser.net
    subdomain = domainParts[0];
  } else if (domainParts.length === 2 && domainParts[0] !== "www") {
    // For domains like corpteaser.net (no subdomain)
    subdomain = "www";
  }
  
  // Construct new URL
  const newUrl = `https://${subdomain}.hofficeexpress.com${url.pathname}${url.search}`;
  
  // Redirect to the new website
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};