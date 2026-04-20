

import { Client, type ClientChannel } from "ssh2";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const host = process.env.VPS_HOST!;
const user = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD!;
if (!host || !password) { console.error("Need VPS_HOST + VPS_PASSWORD"); process.exit(1); }

const REMOTE_ROOT = "/opt/vps-manager";
const REMOTE_PORT = 3005;

function conn(): Promise<Client> {
  return new Promise((resolve, reject) => {
    const c = new Client();
    c.on("ready", () => resolve(c))
      .on("error", reject)
      .connect({ host, username: user, password, readyTimeout: 15000 });
  });
}

function run(c: Client, cmd: string, opts: { silent?: boolean; timeout?: number } = {}): Promise<{ code: number; out: string }> {
  return new Promise((resolve, reject) => {
    let out = "";
    const t = setTimeout(() => reject(new Error(`timeout after ${opts.timeout ?? 120000}ms: ${cmd.slice(0, 80)}`)), opts.timeout ?? 120000);
    c.exec(cmd, { pty: false }, (err: Error | undefined, stream: ClientChannel) => {
      if (err) { clearTimeout(t); return reject(err); }
      stream
        .on("close", (code: number) => { clearTimeout(t); resolve({ code, out }); })
        .on("data", (chunk: Buffer) => {
          const s = chunk.toString();
          out += s;
          if (!opts.silent) process.stdout.write(s);
        })
        .stderr.on("data", (chunk: Buffer) => {
          const s = chunk.toString();
          out += s;
          if (!opts.silent) process.stderr.write(s);
        });
    });
  });
}

function uploadFile(c: Client, local: string, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    c.sftp((err, sftp) => {
      if (err) return reject(err);
      const rs = fs.createReadStream(local);
      const ws = sftp.createWriteStream(remote);
      rs.on("error", reject);
      ws.on("error", reject).on("close", () => resolve());
      rs.pipe(ws);
    });
  });
}

function hex(n: number) {
  return crypto.randomBytes(n).toString("hex");
}

async function tarLocal(archivePath: string): Promise<void> {

  return new Promise((resolve, reject) => {
    const excludes = [
      "./node_modules", "./.next", "./.git", "./.env.local", "./out",
      "./vps-manager" ,
      "*.log",
    ].flatMap((e) => ["--exclude", e]);
    const args = ["--force-local", "-czf", archivePath, ...excludes, "."];
    const p = spawn("tar", args, { cwd: process.cwd(), stdio: "inherit", shell: false });
    p.on("exit", (code) => {

      if (code === 0 || code === 1) resolve();
      else reject(new Error(`tar failed with code ${code}`));
    });
    p.on("error", reject);
  });
}

async function main() {
  console.log(`→ Deploy to ${user}@${host}:${REMOTE_ROOT} (port ${REMOTE_PORT})`);

  const tarPath = path.resolve("..", "vps-manager-deploy.tgz");
  console.log(`→ Creating tarball → ${tarPath}`);
  await tarLocal(tarPath);
  const size = fs.statSync(tarPath).size;
  console.log(`  tarball: ${(size / 1024 / 1024).toFixed(1)} MB`);

  const c = await conn();

  console.log("\n==== 1. Prepare remote dirs ====");
  await run(c, `mkdir -p ${REMOTE_ROOT} /etc/vps-manager && ls -la ${REMOTE_ROOT}`);

  console.log("\n==== 2. Upload tarball ====");
  await uploadFile(c, tarPath, `${REMOTE_ROOT}/tarball.tgz`);
  console.log("  upload OK");

  console.log("\n==== 3. Extract ====");
  await run(c, `cd ${REMOTE_ROOT} && tar xzf tarball.tgz && rm tarball.tgz && ls -la | head -20`);

  console.log("\n==== 4. Start Docker Postgres+Redis (loopback only) ====");
  await run(c, `docker rm -f vpsmgr-postgres 2>/dev/null; docker rm -f vpsmgr-redis 2>/dev/null; true`);
  await run(c, `docker run -d --name vpsmgr-postgres --restart=unless-stopped \
    -p 127.0.0.1:5433:5432 \
    -e POSTGRES_USER=vpsmgr -e POSTGRES_PASSWORD=vpsmgr -e POSTGRES_DB=vps_manager \
    -v vpsmgr-pg-data:/var/lib/postgresql/data \
    postgres:16`);
  await run(c, `docker run -d --name vpsmgr-redis --restart=unless-stopped \
    -p 127.0.0.1:6380:6379 \
    -v vpsmgr-redis-data:/data \
    redis:7`);
  await run(c, `sleep 3 && docker ps --format '{{.Names}}: {{.Status}}' | grep vpsmgr`);

  console.log("\n==== 5. Generate / preserve .env.local ====");
  const existing = await run(c, `test -f ${REMOTE_ROOT}/.env.local && cat ${REMOTE_ROOT}/.env.local || echo ""`, { silent: true });
  const read = (k: string): string | null => {
    const m = existing.out.match(new RegExp(`^${k}="?([^"\\n]*)"?$`, "m"));
    return m?.[1] ?? null;
  };
  const authSecret = read("AUTH_SECRET") || hex(64);
  const masterKey = read("SECRETS_MASTER_KEY") || hex(32);
  const nextauthUrl = read("NEXTAUTH_URL") || `http://127.0.0.1:${REMOTE_PORT}`;
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? read("STRIPE_SECRET_KEY") ?? "";

  const envContent = [
    `DATABASE_URL="postgresql://vpsmgr:vpsmgr@127.0.0.1:5433/vps_manager"`,
    `REDIS_URL="redis://127.0.0.1:6380"`,
    `AUTH_SECRET="${authSecret}"`,
    `NEXTAUTH_URL="${nextauthUrl}"`,
    `SECRETS_MASTER_KEY="${masterKey}"`,
    `STRIPE_SECRET_KEY="${stripeKey}"`,
    `NODE_ENV="production"`,
    `HOSTNAME="127.0.0.1"`,
    `PORT="${REMOTE_PORT}"`,
  ].join("\n");
  await run(c, `cat > ${REMOTE_ROOT}/.env.local <<'__ENV_EOF__'
${envContent}
__ENV_EOF__
chmod 600 ${REMOTE_ROOT}/.env.local`);
  await run(c, `echo ${masterKey} > /etc/vps-manager/master.key && chmod 400 /etc/vps-manager/master.key`);

  console.log("\n==== 6. Install deps (pnpm install) ====");

  await run(c, `command -v make >/dev/null || apt-get install -y --no-install-recommends build-essential python3 2>&1 | tail -5`, { timeout: 180000 });
  await run(c, `cd ${REMOTE_ROOT} && pnpm install --prod=false --ignore-scripts 2>&1 | tail -20`, { timeout: 600000 });

  await run(c, `cd ${REMOTE_ROOT} && pnpm rebuild node-pty 2>&1 | tail -10 || true`, { timeout: 300000 });
  await run(c, `cd ${REMOTE_ROOT} && pnpm exec prisma generate 2>&1 | tail -10`, { timeout: 180000 });

  console.log("\n==== 7. DB push + seed ====");

  await run(c, `for i in 1 2 3 4 5 6 7 8 9 10; do docker exec vpsmgr-postgres pg_isready -U vpsmgr -d vps_manager -q && break; sleep 2; done`);
  await run(c, `cd ${REMOTE_ROOT} && pnpm db:push 2>&1 | tail -10`, { timeout: 120000 });
  await run(c, `cd ${REMOTE_ROOT} && pnpm db:seed 2>&1 | tail -10`, { timeout: 120000 });

  console.log("\n==== 8. Next.js build ====");
  await run(c, `cd ${REMOTE_ROOT} && pnpm exec next build 2>&1 | tail -30`, { timeout: 600000 });

  console.log("\n==== 9. systemd unit ====");
  const unit = `[Unit]
Description=VPS Manager (panel privé)
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=${REMOTE_ROOT}
Environment=NODE_ENV=production
Environment=PORT=${REMOTE_PORT}
Environment=HOSTNAME=127.0.0.1
EnvironmentFile=${REMOTE_ROOT}/.env.local
ExecStart=/usr/bin/pnpm exec next start -p ${REMOTE_PORT} -H 127.0.0.1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
User=root

[Install]
WantedBy=multi-user.target
`;
  await run(c, `cat > /etc/systemd/system/vps-manager.service <<'__UNIT_EOF__'
${unit}__UNIT_EOF__
systemctl daemon-reload
systemctl enable vps-manager.service
systemctl restart vps-manager.service
sleep 2
systemctl status vps-manager.service --no-pager | head -15`);

  console.log("\n==== 10. Verify ====");
  await run(c, `sleep 3 && curl -fsS -o /dev/null -w 'HTTP %{http_code} on localhost:${REMOTE_PORT}\\n' http://127.0.0.1:${REMOTE_PORT}/login || echo 'not yet responding, check journal'`);
  await run(c, `journalctl -u vps-manager --no-pager -n 20`);

  c.end();
  fs.unlinkSync(tarPath);
  console.log("\n✅ Deployed. Next: create subdomain in Plesk pointing to 127.0.0.1:3005.");
}

main().catch((e) => { console.error(e); process.exit(1); });
