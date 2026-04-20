import { PrismaClient, DeployStatus, DeployTarget, SiteStatus, Runtime, Framework, DbEngine, ServiceKind, CertStatus, DomainKind, EnvScope } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding real VPS data (82.165.93.135)…");

  const password = await hash("admin1234", { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });

  await prisma.user.upsert({
    where: { email: "Daiki.ajwad@gmail.com" },
    update: {},
    create: {
      email: "Daiki.ajwad@gmail.com", name: "Daiki", initials: "DI",
      passwordHash: password, role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "matteo.biyikli3224@gmail.com" },
    update: {},
    create: {
      email: "matteo.biyikli3224@gmail.com", name: "Matteo", initials: "MB",
      passwordHash: password, role: "ADMIN",
    },
  });

  type SiteSeed = {
    slug: string; name: string; framework: Framework; runtime: Runtime; status: SiteStatus;
    domainPrimary: string; branch: string; port?: number; deployCount: number;
    cpuUsage?: number; memUsage?: number;
  };
  const realSites: SiteSeed[] = [
    { slug: "bunshin3d",        name: "Bunshin3D",       framework: Framework.NEXTJS,  runtime: Runtime.NODE,   status: SiteStatus.ACTIVE, domainPrimary: "bunshin3d.com",         branch: "main", port: 3001, deployCount: 47, cpuUsage: 0.5, memUsage: 134 },
    { slug: "daikicorp",        name: "Daiki Corp",      framework: Framework.STATIC,  runtime: Runtime.STATIC, status: SiteStatus.ACTIVE, domainPrimary: "daikicorp.fr",          branch: "main", port: undefined, deployCount: 8, cpuUsage: 0, memUsage: 0 },
    { slug: "inkognito",        name: "Inkognito",       framework: Framework.NEXTJS,  runtime: Runtime.NODE,   status: SiteStatus.ACTIVE, domainPrimary: "inkognito.fun",         branch: "main", port: undefined, deployCount: 64, cpuUsage: 0.2, memUsage: 27 },
    { slug: "isopenow",         name: "Is Open Now",     framework: Framework.NEXTJS,  runtime: Runtime.NODE,   status: SiteStatus.ACTIVE, domainPrimary: "isopenow.com",          branch: "main", port: 3004, deployCount: 12, cpuUsage: 0.1, memUsage: 8 },
    { slug: "naruto-mythos",    name: "Naruto Mythos",   framework: Framework.NEXTJS,  runtime: Runtime.DOCKER, status: SiteStatus.ACTIVE, domainPrimary: "narutomythosgame.com",  branch: "main", port: 3000, deployCount: 89, cpuUsage: 3.1, memUsage: 412 },
    { slug: "rapjeu",           name: "Rap Jeu",         framework: Framework.NEXTJS,  runtime: Runtime.NODE,   status: SiteStatus.ACTIVE, domainPrimary: "rapjeu.online",         branch: "main", port: undefined, deployCount: 15, cpuUsage: 0.3, memUsage: 72 },
    { slug: "uplocal",          name: "Uplocal",         framework: Framework.NEXTJS,  runtime: Runtime.DOCKER, status: SiteStatus.ACTIVE, domainPrimary: "uplocal.app",           branch: "main", port: 3003, deployCount: 23, cpuUsage: 0.8, memUsage: 168 },
    { slug: "hiddengame",       name: "Hidden Game",     framework: Framework.NEXTJS,  runtime: Runtime.NODE,   status: SiteStatus.PAUSED, domainPrimary: "hiddengame.fun",        branch: "main", port: undefined, deployCount: 4, cpuUsage: 0, memUsage: 0 },
  ];

  for (const s of realSites) {
    await prisma.site.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug, name: s.name,
        framework: s.framework, runtime: s.runtime, status: s.status,
        domainPrimary: s.domainPrimary, productionBranch: s.branch,
        port: s.port, deployCount: s.deployCount,
        cpuUsage: s.cpuUsage ?? 0, memUsage: s.memUsage ?? 0,
        installCommand: "pnpm install --frozen-lockfile",
        buildCommand: s.framework === Framework.STATIC ? null : "pnpm build",
        startCommand: s.runtime === Runtime.STATIC ? null : "pnpm start",
        nodeVersion: "20.20.0",
        packageManager: "pnpm",
        lastDeployAt: new Date(Date.now() - Math.random() * 7 * 86400_000),
      },
    });
  }

  const domains = [
    { slug: "bunshin3d",     host: "bunshin3d.com",         primary: true },
    { slug: "bunshin3d",     host: "www.bunshin3d.com",     primary: false },
    { slug: "daikicorp",     host: "daikicorp.fr",          primary: true },
    { slug: "inkognito",     host: "inkognito.fun",         primary: true },
    { slug: "isopenow",      host: "isopenow.com",          primary: true },
    { slug: "naruto-mythos", host: "narutomythosgame.com",  primary: true },
    { slug: "naruto-mythos", host: "www.narutomythosgame.com", primary: false },
    { slug: "naruto-mythos", host: "naruto.daikicorp.fr",   primary: false },
    { slug: "rapjeu",        host: "rapjeu.online",         primary: true },
    { slug: "rapjeu",        host: "www.rapjeu.online",     primary: false },
    { slug: "uplocal",       host: "uplocal.app",           primary: true },
    { slug: "uplocal",       host: "www.uplocal.app",       primary: false },
    { slug: "hiddengame",    host: "hiddengame.fun",        primary: true },
  ];
  const sitesBySlug = Object.fromEntries((await prisma.site.findMany()).map(s => [s.slug, s]));
  for (const d of domains) {
    const site = sitesBySlug[d.slug];
    if (!site) continue;
    const in90Days = new Date(Date.now() + 89 * 86400_000);
    await prisma.domain.upsert({
      where: { hostname: d.host },
      update: {},
      create: {
        siteId: site.id, hostname: d.host,
        kind: d.host.startsWith("www.") || d.host.includes(".daikicorp.fr") ? DomainKind.SUBDOMAIN : DomainKind.APEX,
        isPrimary: d.primary,
        certStatus: CertStatus.ISSUED, certIssuedAt: new Date(Date.now() - 30 * 86400_000), certExpiresAt: in90Days,
        dnsVerified: true,
      },
    });
  }

  const services: { kind: ServiceKind; identifier: string; displayName: string; state: string; cpu: number; memMb: number; uptime: string; siteSlug: string | null }[] = [
    { kind: ServiceKind.SYSTEMD, identifier: "naruto-mythos.service",  displayName: "naruto-mythos.service",  state: "running", cpu: 3.1, memMb: 412, uptime: "7d",  siteSlug: "naruto-mythos" },
    { kind: ServiceKind.SYSTEMD, identifier: "nginx.service",          displayName: "nginx.service",          state: "running", cpu: 0.4, memMb: 22,  uptime: "47d", siteSlug: null },
    { kind: ServiceKind.SYSTEMD, identifier: "mariadb.service",        displayName: "mariadb.service",        state: "running", cpu: 1.1, memMb: 148, uptime: "47d", siteSlug: null },
    { kind: ServiceKind.SYSTEMD, identifier: "mongod.service",         displayName: "mongod.service",         state: "running", cpu: 0.3, memMb: 86,  uptime: "47d", siteSlug: null },
    { kind: ServiceKind.SYSTEMD, identifier: "docker.service",         displayName: "docker.service",         state: "running", cpu: 0.2, memMb: 54,  uptime: "47d", siteSlug: null },
    { kind: ServiceKind.SYSTEMD, identifier: "php8.3-fpm.service",     displayName: "php8.3-fpm.service",     state: "running", cpu: 0.1, memMb: 48,  uptime: "47d", siteSlug: null },
    { kind: ServiceKind.SYSTEMD, identifier: "apache2.service",        displayName: "apache2.service",        state: "failed",  cpu: 0,   memMb: 0,   uptime: "-",   siteSlug: null },
    { kind: ServiceKind.DOCKER,  identifier: "naruto-mythos",          displayName: "naruto-mythos",          state: "running", cpu: 3.1, memMb: 412, uptime: "7d",  siteSlug: "naruto-mythos" },
    { kind: ServiceKind.DOCKER,  identifier: "uplocal",                displayName: "uplocal",                state: "running", cpu: 0.8, memMb: 168, uptime: "8h",  siteSlug: "uplocal" },
    { kind: ServiceKind.PM2,     identifier: "bunshin3d",              displayName: "pm2: bunshin3d",         state: "running", cpu: 0.5, memMb: 134, uptime: "7d",  siteSlug: "bunshin3d" },
    { kind: ServiceKind.PM2,     identifier: "inkognito",              displayName: "pm2: inkognito",         state: "running", cpu: 0.2, memMb: 27,  uptime: "4d",  siteSlug: "inkognito" },
    { kind: ServiceKind.PM2,     identifier: "isopenow",               displayName: "pm2: isopenow",          state: "running", cpu: 0.1, memMb: 8,   uptime: "4d",  siteSlug: "isopenow" },
  ];
  for (const svc of services) {
    await prisma.managedService.upsert({
      where: { kind_identifier: { kind: svc.kind, identifier: svc.identifier } },
      update: {},
      create: svc,
    });
  }

  for (const db of [
    { name: "vps_manager",  engine: DbEngine.POSTGRES, version: "16",        port: 5433, sizeMb: 4,    connections: 2 },
    { name: "cache",        engine: DbEngine.REDIS,    version: "7",         port: 6380, sizeMb: 1,    connections: 1 },
    { name: "apsc",         engine: DbEngine.MARIADB,  version: "10.11",     port: 3306, sizeMb: 32,   connections: 3 },
    { name: "psa",          engine: DbEngine.MARIADB,  version: "10.11",     port: 3306, sizeMb: 184,  connections: 5 },
    { name: "roundcubemail",engine: DbEngine.MARIADB,  version: "10.11",     port: 3306, sizeMb: 48,   connections: 1 },
    { name: "phpmyadmin",   engine: DbEngine.MARIADB,  version: "10.11",     port: 3306, sizeMb: 2,    connections: 0 },
    { name: "local",        engine: DbEngine.MONGO,    version: "7.0",       port: 27017,sizeMb: 64,   connections: 2 },
  ]) {
    await prisma.hostedDatabase.create({
      data: { ...db, username: "vpsmgr", passwordEnc: "seed" },
    }).catch(() => {});
  }

  const deploys = [
    { siteSlug: "bunshin3d",     commit: "a1b2c3d", msg: "feat: update hero section",                     author: "matteo", status: DeployStatus.READY,    branch: "main", durationMs: 92_000,  minsAgo: 45 },
    { siteSlug: "uplocal",       commit: "f4e5d6c", msg: "fix: dark mode contrast",                       author: "matteo", status: DeployStatus.READY,    branch: "main", durationMs: 158_000, minsAgo: 8*60 },
    { siteSlug: "naruto-mythos", commit: "7a8b9c0", msg: "feat: card dex browser",                        author: "daiki",  status: DeployStatus.READY,    branch: "main", durationMs: 211_000, minsAgo: 7*24*60 },
    { siteSlug: "isopenow",      commit: "2d3e4f5", msg: "perf: reduce bundle 18kb",                      author: "matteo", status: DeployStatus.READY,    branch: "main", durationMs: 44_000,  minsAgo: 4*24*60 },
    { siteSlug: "inkognito",     commit: "9e8d7c6", msg: "chore: bump next to 15.0.3",                    author: "matteo", status: DeployStatus.READY,    branch: "main", durationMs: 71_000,  minsAgo: 4*24*60 },
    { siteSlug: "rapjeu",        commit: "b5a4c3d", msg: "content: weekly challenges",                    author: "daiki",  status: DeployStatus.READY,    branch: "main", durationMs: 38_000,  minsAgo: 2*24*60 },
  ];
  for (const d of deploys) {
    const site = sitesBySlug[d.siteSlug];
    if (!site) continue;
    await prisma.deployment.create({
      data: {
        siteId: site.id,
        commitSha: d.commit, commitMessage: d.msg, commitAuthor: d.author,
        branch: d.branch, target: DeployTarget.PRODUCTION,
        status: d.status, durationMs: d.durationMs,
        queuedAt: new Date(Date.now() - d.minsAgo * 60_000),
        trigger: "git.push",
      },
    });
  }

  for (const i of [
    { severity: "warning", message: "apache2.service failed (normal: nginx a pris le relais via Plesk)", open: true },
    { severity: "info",    message: "SSL Let's Encrypt renouvelé pour 8 domaines", open: false, closedAt: new Date() },
  ]) {
    await prisma.incident.create({ data: { ...i, openedAt: new Date() } }).catch(() => {});
  }

  for (const r of [
    { action: "ALLOW", port: "22",     protocol: "tcp", source: "0.0.0.0/0", comment: "OpenSSH",        order: 10 },
    { action: "ALLOW", port: "80",     protocol: "tcp", source: "0.0.0.0/0", comment: "Nginx HTTP",     order: 20 },
    { action: "ALLOW", port: "443",    protocol: "tcp", source: "0.0.0.0/0", comment: "Nginx HTTPS",    order: 30 },
  ]) {
    await prisma.firewallRule.create({ data: r }).catch(() => {});
  }

  const naruto = sitesBySlug["naruto-mythos"];
  if (naruto) {
    const group = await prisma.envGroup.create({
      data: { siteId: naruto.id, name: "production", description: "Variables injectées au container Docker" },
    }).catch(() => prisma.envGroup.findFirst({ where: { siteId: naruto.id } }));
    if (group) {
      for (const v of [
        { key: "NEXTAUTH_URL",      valueEnc: "https://narutomythosgame.com", scope: EnvScope.PRODUCTION, sensitive: false },
        { key: "NODE_ENV",          valueEnc: "production",                    scope: EnvScope.PRODUCTION, sensitive: false },
        { key: "PORT",              valueEnc: "3000",                           scope: EnvScope.PRODUCTION, sensitive: false },
        { key: "HOSTNAME",          valueEnc: "0.0.0.0",                        scope: EnvScope.PRODUCTION, sensitive: false },
        { key: "DATABASE_URL",      valueEnc: "mongodb+srv://••••••••@cluster0.q4izgvf.mongodb.net/naruto-mythos-tcg", scope: EnvScope.PRODUCTION, sensitive: true },
        { key: "NEXTAUTH_SECRET",   valueEnc: "••••••••••••••••••••••••",       scope: EnvScope.PRODUCTION, sensitive: true },
      ]) {
        await prisma.envVariable.create({ data: { ...v, groupId: group.id } }).catch(() => {});
      }
    }
  }

  const logSeed = [
    { source: "nginx",    level: "info",  siteSlug: "bunshin3d",     message: "200 GET / · 12ms" },
    { source: "nginx",    level: "info",  siteSlug: "uplocal",       message: "200 GET /api/search · 48ms" },
    { source: "nginx",    level: "info",  siteSlug: "naruto-mythos", message: "200 POST /api/cards/draw · 94ms" },
    { source: "app",      level: "info",  siteSlug: "naruto-mythos", message: "cards.draw ok userId=u102 n=5" },
    { source: "systemd",  level: "info",  siteSlug: null,            message: "naruto-mythos.service: Running" },
    { source: "docker",   level: "info",  siteSlug: "naruto-mythos", message: "container naruto-mythos healthy" },
    { source: "docker",   level: "info",  siteSlug: "uplocal",       message: "container uplocal healthy" },
    { source: "pm2",      level: "info",  siteSlug: "bunshin3d",     message: "process bunshin3d online (134.6 MB)" },
    { source: "pm2",      level: "info",  siteSlug: "isopenow",      message: "process isopenow online (7.5 MB)" },
    { source: "nginx",    level: "info",  siteSlug: "isopenow",      message: "200 GET / · 8ms" },
    { source: "nginx",    level: "info",  siteSlug: "rapjeu",        message: "200 GET / · 22ms" },
    { source: "mariadb",  level: "info",  siteSlug: null,            message: "Connection from psa user (5 active)" },
    { source: "fail2ban", level: "warn",  siteSlug: null,            message: "[sshd] found 46.x.x.x · 3 attempts" },
  ];
  for (const l of logSeed) {
    await prisma.logEntry.create({ data: l });
  }

  for (const [key, value] of Object.entries({
    "ui.theme.default": "dark",
    "ui.locale.default": "fr",
    "deploy.keepHistory": 10,
    "vps.hostname": "82.165.93.135",
    "vps.panel": "plesk",
  })) {
    await prisma.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  console.log("✅ Seed complete · 8 sites, 13 domains, 12 services réels.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
