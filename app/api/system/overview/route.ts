import { getSystemOverview, formatUptime } from "@/src/infra/system";
import { errorResponse, ok } from "@/lib/api";

export async function GET() {
  try {
    const o = await getSystemOverview();
    return ok({
      hostname: o.hostname,
      kernel: o.kernel,
      uptime: formatUptime(o.uptimeSeconds),
      uptimeSeconds: o.uptimeSeconds,
      cpu: {
        count: o.cpuCount,
        usage: o.cpuUsagePercent,
        load: o.loadAvg,
      },
      memory: {
        totalMb: o.memTotalMb,
        usedMb: o.memUsedMb,
        freeMb: o.memFreeMb,
        usedPercent: Math.round((o.memUsedMb / o.memTotalMb) * 100),
      },
      disks: o.disks,
      network: { inKbps: o.netInKbps, outKbps: o.netOutKbps },
      platform: process.platform,
    });
  } catch (e) { return errorResponse(e); }
}
