import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok, ApiError } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await prisma.hostedDatabase.findUnique({ where: { id } });
    if (!db) throw new ApiError("db.not_found", "Database not found", 404);

    if (db.engine !== "POSTGRES" || db.name !== "vps_manager") {
      return ok({ data: [], note: "Introspection non disponible pour cette base depuis le panel" });
    }

    const rows = await prisma.$queryRawUnsafe<{ table_name: string; n_live_tup: bigint; size_bytes: bigint; idx: bigint }[]>(`
      SELECT t.table_name,
             COALESCE(s.n_live_tup, 0)::bigint AS n_live_tup,
             pg_total_relation_size(('public.' || quote_ident(t.table_name))::regclass) AS size_bytes,
             COALESCE((SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename=t.table_name), 0)::bigint AS idx
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = 'public'
      WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
      ORDER BY pg_total_relation_size(('public.' || quote_ident(t.table_name))::regclass) DESC
    `);
    const fmtSize = (b: bigint) => {
      const n = Number(b);
      if (n < 1024) return `${n} B`;
      if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
      if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
      return `${(n / 1024 ** 3).toFixed(2)} GB`;
    };
    return ok({
      data: rows.map((r) => ({
        name: r.table_name,
        rows: Number(r.n_live_tup),
        size: fmtSize(r.size_bytes),
        idx: Number(r.idx),
      })),
    });
  } catch (e) { return errorResponse(e); }
}
