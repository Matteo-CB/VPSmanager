import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const keys = ["backup.schedule", "backup.retention", "backup.destination", "backup.encryption"];
    const settings = await prisma.systemSetting.findMany({ where: { key: { in: keys } } });
    const m = Object.fromEntries(settings.map((s) => [s.key, s.value as unknown]));
    return ok({
      schedule: (m["backup.schedule"] as string) ?? null,
      retention: (m["backup.retention"] as string) ?? null,
      destination: (m["backup.destination"] as string) ?? null,
      encryption: (m["backup.encryption"] as string) ?? null,
    });
  } catch (e) { return errorResponse(e); }
}
