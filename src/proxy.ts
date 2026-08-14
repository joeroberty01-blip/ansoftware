import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/finance",
  "/billing",
  "/staff",
  "/reports",
  "/api/staff",
  "/api/expenses",
  "/api/finance",
  "/api/invoices",
  "/api/clients",
  "/api/payroll",
  "/api/leave-requests",
  "/api/dashboard",
  "/api/reports",
  "/inventory",
  "/api/inventory",
  "/patients",
  "/api/patients",
  "/documents",
  "/api/documents",
  "/home-visits",
  "/api/home-visits",
  "/print",
  "/receipts",
  "/api/payments",
  "/expenses",
  "/api/bills",
  "/marketing",
  "/api/marketing",
  "/settings",
  "/api/settings",
];

const ADMIN_ONLY_PREFIXES = [
  "/finance",
  "/reports",
  "/staff",
  "/api/staff",
  "/api/expenses",
  "/api/finance",
  "/api/dashboard",
  "/api/reports",
  "/expenses",
  "/api/bills",
  "/marketing",
  "/api/marketing",
];

// "My own profile" routes: STAFF must be able to reach these even though
// /staff and /api/staff are otherwise Admin-only. The route handlers behind
// these paths do their own self-or-admin ownership checks against the real
// staff record, so the proxy only needs to let the request through.
const ADMIN_ONLY_EXCEPTIONS = ["/staff/me", "/api/staff/me"];
const ID_CARD_ROUTE = /^\/api\/staff\/[^/]+\/id-card$/;

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!matches(pathname, PROTECTED_PREFIXES)) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { error: "Unahitaji kuingia kwanza." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminOnlyException =
    matches(pathname, ADMIN_ONLY_EXCEPTIONS) || ID_CARD_ROUTE.test(pathname);

  if (
    matches(pathname, ADMIN_ONLY_PREFIXES) &&
    !isAdminOnlyException &&
    session.role !== "ADMIN"
  ) {
    if (isApi) {
      return NextResponse.json(
        { error: "Ruhusa hairuhusiwi." },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/finance/:path*",
    "/billing/:path*",
    "/staff/:path*",
    "/reports/:path*",
    "/api/staff/:path*",
    "/api/expenses/:path*",
    "/api/finance/:path*",
    "/api/invoices/:path*",
    "/api/clients/:path*",
    "/api/payroll/:path*",
    "/api/leave-requests/:path*",
    "/api/dashboard/:path*",
    "/api/reports/:path*",
    "/inventory/:path*",
    "/api/inventory/:path*",
    "/patients/:path*",
    "/api/patients/:path*",
    "/documents/:path*",
    "/api/documents/:path*",
    "/home-visits/:path*",
    "/api/home-visits/:path*",
    "/print/:path*",
    "/receipts/:path*",
    "/api/payments/:path*",
    "/expenses/:path*",
    "/api/bills/:path*",
    "/marketing/:path*",
    "/api/marketing/:path*",
    "/settings/:path*",
    "/api/settings/:path*",
  ],
};
