

import "server-only";
import { promisify } from "node:util";
import { execFile as execFileCb, exec as execCb } from "node:child_process";
import fs from "node:fs/promises";
import { prisma } from "./prisma";
import { DbEngine, ServiceKind } from "@prisma/client";

const execFile = promisify(execFileCb);
const exec = promisify(execCb);
const isLinux = process.platform === "linux";

async function tryExec(cmd: string, timeoutMs = 5000): Promise<string | null> {
  if (!isLinux) return null;
  try {
    const { stdout } = await exec(cmd, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 });
    return stdout;
  } catch { return null; }
}

export async function discoverSystem(): Promise<void> {
  if (!isLinux) return;
  await Promise.all([
    discoverDatabases().catch((e) => console.warn("[discovery.db]", e)),
    discoverServices().catch((e) => console.warn("[discovery.svc]", e)),
    discoverDns().catch((e) => console.warn("[discovery.dns]", e)),
    ingestNginxLogs().catch((e) => console.warn("[discovery.logs]", e)),
  ]);
}

async function discoverDns(): Promise<void> {
  let files: string[] = [];
  try { files = await fs.readdir("/etc/nginx/sites-enabled"); } catch { return; }

  const hostnames = new Set<string>();
  for (const f of files) {
    if (f === "default") continue;
    let content = "";
    try { content = await fs.readFile(`/etc/nginx/sites-enabled/${f}`, "utf8"); } catch { continue; }
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*server_name\s+([^;]+);/);
      if (!m) continue;
      for (const h of m[1].split(/\s+/)) {
        const host = h.trim();
        if (!host || host === "_" || host.startsWith("$")) continue;
        hostnames.add(host);
      }
    }
  }
  if (hostnames.size === 0) return;

  const byApex = new Map<string, string[]>();
  for (const h of hostnames) {
    const parts = h.split(".");
    const apex = parts.length <= 2 ? h : parts.slice(-2).join(".");
    if (!byApex.has(apex)) byApex.set(apex, []);
    byApex.get(apex)!.push(h);
  }

  const dns = await import("node:dns/promises");
  type Rec = { type: string; name: string; content: string; ttl: number; priority?: number };

  for (const [apex, hosts] of byApex) {
    const records: Rec[] = [];
    for (const h of hosts) {
      const label = h === apex ? "@" : h.slice(0, h.length - apex.length - 1);

      try {
        const v = await Promise.race([dns.resolve4(h), timeout<string[]>(2000)]);
        for (const ip of v) records.push({ type: "A", name: label, content: ip, ttl: 300 });
      } catch {}
      try {
        const v = await Promise.race([dns.resolve6(h), timeout<string[]>(2000)]);
        for (const ip of v) records.push({ type: "AAAA", name: label, content: ip, ttl: 300 });
      } catch {}
      try {
        const v = await Promise.race([dns.resolveCname(h), timeout<string[]>(2000)]);
        for (const c of v) records.push({ type: "CNAME", name: label, content: c, ttl: 300 });
      } catch {}

      if (h === apex) {
        try {
          const mx = await Promise.race([dns.resolveMx(h), timeout<{ exchange: string; priority: number }[]>(2000)]);
          for (const m of mx) records.push({ type: "MX", name: "@", content: m.exchange, ttl: 3600, priority: m.priority });
        } catch {}
        try {
          const txt = await Promise.race([dns.resolveTxt(h), timeout<string[][]>(2000)]);
          for (const chunks of txt) records.push({ type: "TXT", name: "@", content: chunks.join(""), ttl: 3600 });
        } catch {}
      }
    }

    if (records.length === 0) continue;

    await prisma.$transaction(async (tx) => {
      const zone = await tx.dnsZone.upsert({
        where: { domain: apex },
        update: { provider: "ovh" },
        create: { domain: apex, provider: "ovh" },
      });
      await tx.dnsRecord.deleteMany({ where: { zoneId: zone.id } });
      for (const r of records) {
        await tx.dnsRecord.create({ data: { ...r, zoneId: zone.id } }).catch(() => {});
      }
    });
  }
}

function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, rej) => setTimeout(() => rej(new Error("dns timeout")), ms));
}

async function discoverDatabases(): Promise<void> {
  const rows: { engine: DbEngine; name: string; version: string; host: string; port: number; sizeMb: number; connections: number }[] = [];

  const pgVer = await tryExec(`docker exec vpsmgr-postgres psql -U vpsmgr -d vps_manager -tA -c "SHOW server_version"`);
  if (pgVer) {
    const dbs = await tryExec(`docker exec vpsmgr-postgres psql -U vpsmgr -tA -c "SELECT datname, pg_database_size(datname) FROM pg_database WHERE datistemplate=false"`);
    for (const line of (dbs?.split("\n") ?? [])) {
      const [name, sizeStr] = line.split("|");
      if (!name || name === "postgres") continue;
      const connStr = await tryExec(`docker exec vpsmgr-postgres psql -U vpsmgr -tA -c "SELECT count(*) FROM pg_stat_activity WHERE datname='${name}'"`);
      rows.push({
        engine: DbEngine.POSTGRES,
        name,
        version: pgVer.trim().split(" ")[0] ?? "16",
        host: "127.0.0.1",
        port: 5433,
        sizeMb: Math.round(Number(sizeStr ?? 0) / 1024 / 1024),
        connections: Number((connStr ?? "0").trim()) || 0,
      });
    }
  }

  const redisPing = await tryExec(`docker exec vpsmgr-redis redis-cli PING`);
  if (redisPing?.trim() === "PONG") {
    const info = await tryExec(`docker exec vpsmgr-redis redis-cli INFO server`);
    const versionMatch = info?.match(/redis_version:(\S+)/);
    const mem = await tryExec(`docker exec vpsmgr-redis redis-cli INFO memory`);
    const memBytes = mem?.match(/used_memory:(\d+)/)?.[1];
    const clients = await tryExec(`docker exec vpsmgr-redis redis-cli CLIENT LIST | wc -l`);
    rows.push({
      engine: DbEngine.REDIS,
      name: "vpsmgr-cache",
      version: versionMatch?.[1] ?? "7",
      host: "127.0.0.1",
      port: 6380,
      sizeMb: Math.round(Number(memBytes ?? 0) / 1024 / 1024),
      connections: Number((clients ?? "0").trim()) || 0,
    });
  }

  const mariaVer = await tryExec(`mysql -N -e "SELECT VERSION()" 2>/dev/null`);
  if (mariaVer) {
    const list = await tryExec(`mysql -N -e "SELECT table_schema, ROUND(SUM(data_length+index_length)/1024/1024) FROM information_schema.tables GROUP BY table_schema"`);
    const procs = await tryExec(`mysql -N -e "SELECT db, COUNT(*) FROM information_schema.processlist WHERE db IS NOT NULL GROUP BY db"`);
    const connByDb = new Map<string, number>();
    for (const l of (procs?.split("\n") ?? [])) {
      const [db, n] = l.split("\t");
      if (db) connByDb.set(db, Number(n));
    }
    for (const l of (list?.split("\n") ?? [])) {
      const [schema, sizeMb] = l.split("\t");
      if (!schema || schema === "information_schema" || schema === "performance_schema" || schema === "mysql" || schema === "sys") continue;
      rows.push({
        engine: DbEngine.MARIADB,
        name: schema,
        version: mariaVer.trim(),
        host: "127.0.0.1",
        port: 3306,
        sizeMb: Number(sizeMb) || 0,
        connections: connByDb.get(schema) ?? 0,
      });
    }
  }

  const mongoVer = await tryExec(`mongosh --quiet --eval "db.version()" 2>/dev/null || mongo --quiet --eval "db.version()" 2>/dev/null`);
  if (mongoVer && !mongoVer.includes("Error")) {
    const dbsOut = await tryExec(`mongosh --quiet --eval "db.adminCommand({listDatabases:1}).databases.forEach(d => print(d.name + '\\t' + d.sizeOnDisk))" 2>/dev/null`);
    const clients = await tryExec(`mongosh --quiet --eval "db.serverStatus().connections.current" 2>/dev/null`);
    for (const l of (dbsOut?.split("\n") ?? [])) {
      const [name, size] = l.split("\t");
      if (!name || name === "admin" || name === "config" || name === "local") continue;
      rows.push({
        engine: DbEngine.MONGO,
        name,
        version: mongoVer.trim(),
        host: "127.0.0.1",
        port: 27017,
        sizeMb: Math.round(Number(size ?? 0) / 1024 / 1024),
        connections: Number((clients ?? "0").trim()) || 0,
      });
    }
  }

  if (rows.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.hostedDatabase.deleteMany();
    for (const r of rows) {
      await tx.hostedDatabase.create({
        data: { ...r, username: "vpsmgr", passwordEnc: "discovered" },
      });
    }
  });
}

async function discoverServices(): Promise<void> {
  const rows: { kind: ServiceKind; identifier: string; displayName: string; state: string; cpu: number; memMb: number; uptime: string; siteSlug: string | null }[] = [];

  const units = await tryExec(`systemctl list-units --type=service --all --no-pager --no-legend --plain 2>/dev/null | awk '{print $1, $3}'`);
  if (units) {
    const interesting = /(nginx|mariadb|mongod|docker|php.*fpm|postgres|redis|fail2ban|certbot|vps-|site-|naruto-|uplocal|bunshin|inkognito|isopenow|rapjeu|hiddengame)/i;
    for (const l of units.split("\n")) {
      const [unit, state] = l.trim().split(/\s+/);
      if (!unit?.endsWith(".service")) continue;
      if (!interesting.test(unit) && !unit.startsWith("site-") && !unit.startsWith("vps-")) continue;
      const siteSlug = (unit.match(/^site-(\S+)\.service$/) ?? unit.match(/^vps-site-(\S+)\.service$/))?.[1] ?? null;
      rows.push({
        kind: ServiceKind.SYSTEMD,
        identifier: unit,
        displayName: unit,
        state: state === "running" ? "running" : state === "failed" ? "failed" : "stopped",
        cpu: 0, memMb: 0, uptime: "—",
        siteSlug,
      });
    }
  }

  const docker = await tryExec(`docker ps -a --format "{{.Names}}\t{{.State}}\t{{.RunningFor}}" 2>/dev/null`);
  if (docker) {
    for (const l of docker.split("\n")) {
      const [name, state, uptime] = l.split("\t");
      if (!name) continue;
      rows.push({
        kind: ServiceKind.DOCKER,
        identifier: name,
        displayName: name,
        state: state === "running" ? "running" : state === "exited" ? "stopped" : state ?? "stopped",
        cpu: 0, memMb: 0,
        uptime: uptime ?? "—",
        siteSlug: name.includes("naruto") ? "naruto-mythos" : name.includes("uplocal") ? "uplocal" : null,
      });
    }
  }

  const pm2 = await tryExec(`pm2 jlist 2>/dev/null`);
  if (pm2) {
    try {
      const arr = JSON.parse(pm2) as Array<{ name: string; pm2_env: { status: string; pm_uptime: number; pm_cwd: string }; monit?: { cpu: number; memory: number } }>;
      for (const p of arr) {
        const uptime = p.pm2_env.pm_uptime ? humanUptime(Date.now() - p.pm2_env.pm_uptime) : "—";
        rows.push({
          kind: ServiceKind.PM2,
          identifier: p.name,
          displayName: `pm2: ${p.name}`,
          state: p.pm2_env.status === "online" ? "running" : p.pm2_env.status,
          cpu: p.monit?.cpu ?? 0,
          memMb: Math.round((p.monit?.memory ?? 0) / 1024 / 1024),
          uptime,
          siteSlug: p.name,
        });
      }
    } catch {}
  }

  if (rows.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.managedService.deleteMany();
    for (const r of rows) {
      await tx.managedService.create({ data: r }).catch(() => {});
    }
  });
}

function humanUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const NGINX_LOG_DIR = "/var/log/nginx";
let lastOffsets: Record<string, number> = {};

async function ingestNginxLogs(): Promise<void> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(NGINX_LOG_DIR)).filter((f) => f.endsWith(".access.log") || f === "access.log");
  } catch { return; }

  for (const f of files) {
    const full = `${NGINX_LOG_DIR}/${f}`;
    const siteSlug = f.replace(/\.access\.log$/, "").replace(/\.log$/, "") || null;
    let stat;
    try { stat = await fs.stat(full); } catch { continue; }
    const prev = lastOffsets[full] ?? Math.max(0, stat.size - 100_000);
    if (stat.size <= prev) continue;

    const size = stat.size - prev;
    if (size > 5_000_000) { lastOffsets[full] = stat.size; continue; }
    let chunk: Buffer;
    try {
      const { stdout } = await execFile("dd", ["if=" + full, "bs=1", `skip=${prev}`, `count=${size}`, "status=none"], { maxBuffer: 10 * 1024 * 1024, encoding: "buffer" });
      chunk = stdout as unknown as Buffer;
    } catch { continue; }
    lastOffsets[full] = stat.size;

    const lines = chunk.toString("utf8").split("\n").filter(Boolean);
    const events: { siteSlug: string; path: string; referrer: string | null; country: string | null; device: string | null; kind: string; timestamp: Date }[] = [];
    for (const line of lines.slice(-200)) {

      const m = line.match(/^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) [^"]+" (\d+) \S+ "([^"]*)" "([^"]*)"/);
      if (!m) continue;
      const [, ip, dateStr, method, path, status, ref, ua] = m;
      if (method !== "GET" || !path || path.startsWith("/_next/") || path.startsWith("/favicon") || path.startsWith("/robots") || !(status ?? "").startsWith("2")) continue;
      events.push({
        siteSlug: siteSlug ?? "unknown",
        path,
        referrer: ref && ref !== "-" ? ref : null,
        country: null,
        device: /Mobile|Android|iPhone/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop",
        kind: "pageview",
        timestamp: parseNginxDate(dateStr) ?? new Date(),
      });
      void ip;
    }

    if (events.length > 0) {
      await prisma.analyticsEvent.createMany({ data: events, skipDuplicates: true }).catch(() => {});
    }
  }
}

function parseNginxDate(s: string): Date | null {

  const m = s.match(/(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})/);
  if (!m) return null;
  const months: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  const iso = `${m[3]}-${months[m[2]]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}${m[7].slice(0, 3)}:${m[7].slice(3)}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}
