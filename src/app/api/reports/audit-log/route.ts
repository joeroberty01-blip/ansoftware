import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listAuditLogs,
  countAuditLogs,
  listAuditLogActors,
  listAuditLogEntities,
} from "@/lib/audit";

function isValidDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
  const entity = req.nextUrl.searchParams.get("entity") ?? undefined;
  const allParam = req.nextUrl.searchParams.get("all") === "true";
  const pageParam = req.nextUrl.searchParams.get("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const pageSize = 50;

  const filters = {
    from: isValidDate(fromParam) ? fromParam : undefined,
    to: isValidDate(toParam) ? toParam : undefined,
    userId,
    entity,
  };

  const [logs, total, actors, entities] = await Promise.all([
    listAuditLogs({
      ...filters,
      limit: allParam ? 2000 : pageSize,
      offset: allParam ? 0 : (page - 1) * pageSize,
    }),
    countAuditLogs(filters),
    listAuditLogActors(),
    listAuditLogEntities(),
  ]);

  return NextResponse.json({ logs, total, page, pageSize, actors, entities });
}
