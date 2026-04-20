import "server-only";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";
import { prisma } from "./prisma";

const exec = promisify(execCb);
const isLinux = process.platform === "linux";

export type DeployConfig = {
  slug: string;
  name: string;
  repoFullName: string;
  branch: string;
  hostnames: string[];
  port: number;
  email: string;
  githubToken: string;
  framework: string;
  runtime: string;
};

const USED_PORT_RANGE = { min: 3010, max: 3099 };

export async function allocatePort(): Promise<number> {
  const sites = await prisma.site.findMany({ select: { port: true } });
  const inUse = new Set(sites.map((s) => s.port).filter((p): p is number => !!p));
  for (let p = USED_PORT_RANGE.min; p <= USED_PORT_RANGE.max; p++) {
    if (inUse.has(p)) continue;

    if (isLinux) {
      try {
        const { stdout } = await exec(`ss -tlnp 2>/dev/null | grep -c ":${p} " || true`);
        if (Number(stdout.trim()) > 0) continue;
      } catch {  }
    }
    return p;
  }
  throw new Error("No free port in allocated range");
}

export async function deploy(cfg: DeployConfig, deploymentId: string): Promise<void> {
  if (!isLinux) {
    await appendLog(deploymentId, "system", "Host is not Linux — deployment can only run on the VPS");
    await finishDeploy(deploymentId, "ERROR", "not-linux");
    return;
  }

  const root = `/opt/sites/${cfg.slug}`;
  const unit = `site-${cfg.slug}.service`;
  const primary = cfg.hostnames[0];
  const startedAt = Date.now();

  try {
    await setStatus(deploymentId, "CLONING");
    await run(deploymentId, "clone", `mkdir -p ${root}`);
    await run(deploymentId, "clone", `cd ${root} && if [ -d .git ]; then \
      git -c http.extraHeader="Authorization: bearer ${cfg.githubToken}" fetch origin ${cfg.branch} && \
      git reset --hard origin/${cfg.branch} ; \
    else \
      git clone -b ${cfg.branch} https://x-access-token:${cfg.githubToken}@github.com/${cfg.repoFullName}.git . ; \
    fi`);

    await run(deploymentId, "clone", `cd ${root} && git remote set-url origin https://github.com/${cfg.repoFullName}.git`);

    let framework = cfg.framework;
    try {
      const pkg = await fs.readFile(`${root}/package.json`, "utf8");
      const j = JSON.parse(pkg);
      if (!framework || framework === "CUSTOM") {
        framework = j.dependencies?.next ? "NEXTJS" : j.dependencies?.astro ? "ASTRO" : "STATIC";
      }
    } catch {}

    await setStatus(deploymentId, "INSTALLING");
    await run(deploymentId, "install", `cd ${root} && pnpm install --prod=false --ignore-scripts 2>&1 | tail -20`);

    if (framework !== "STATIC") {
      await setStatus(deploymentId, "BUILDING");
      await run(deploymentId, "build", `cd ${root} && pnpm run build 2>&1 | tail -60`);
    }

    await setStatus(deploymentId, "DEPLOYING");

    if (framework !== "STATIC") {
      const content = `[Unit]
Description=Site ${cfg.slug} (${framework}, port ${cfg.port})
After=network.target

[Service]
Type=simple
WorkingDirectory=${root}
Environment=NODE_ENV=production
Environment=PORT=${cfg.port}
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/pnpm exec next start -p ${cfg.port} -H 127.0.0.1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
User=root

[Install]
WantedBy=multi-user.target
`;
      await fs.writeFile(`/etc/systemd/system/${unit}`, content, "utf8");
      await run(deploymentId, "deploy", `systemctl daemon-reload && systemctl enable ${unit} && systemctl restart ${unit}`);

      await run(deploymentId, "deploy", `for i in $(seq 1 20); do \
        curl -fsS -o /dev/null http://127.0.0.1:${cfg.port}/ 2>/dev/null && echo "backend OK after \${i}s" && break ; \
        sleep 1 ; \
      done`);
    }

    const serverNames = cfg.hostnames.join(" ");
    const backendLocation = framework === "STATIC"
      ? `root ${root};\n    index index.html;\n    try_files $uri $uri/ $uri.html /index.html;`
      : `proxy_pass http://127.0.0.1:${cfg.port};\n    proxy_http_version 1.1;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto $scheme;\n    proxy_set_header Upgrade $http_upgrade;\n    proxy_set_header Connection "upgrade";\n    proxy_read_timeout 300s;`;

    const httpVhost = `# Managed by VPS Manager
server {
  listen 80;
  listen [::]:80;
  server_name ${serverNames};

  location ^~ /.well-known/acme-challenge/ {
    root /var/www/html;
    try_files $uri =404;
  }

  location / {
    ${backendLocation}
  }
}
`;
    await fs.mkdir("/var/www/html/.well-known/acme-challenge", { recursive: true });
    await fs.writeFile(`/etc/nginx/sites-available/${primary}`, httpVhost, "utf8");
    await run(deploymentId, "nginx", `ln -sfn /etc/nginx/sites-available/${primary} /etc/nginx/sites-enabled/${primary} && nginx -t && nginx -s reload`);

    const dFlags = cfg.hostnames.map((h) => `-d ${h}`).join(" ");
    const certExists = await exists(`/etc/letsencrypt/live/${primary}`);
    if (!certExists) {
      await run(deploymentId, "ssl", `certbot certonly --webroot -w /var/www/html ${dFlags} --non-interactive --agree-tos --email ${cfg.email}`);
    } else {
      await appendLog(deploymentId, "ssl", "cert already exists — reusing");
    }

    const httpsVhost = `# Managed by VPS Manager
server {
  listen 80;
  listen [::]:80;
  server_name ${serverNames};
  location ^~ /.well-known/acme-challenge/ { root /var/www/html; try_files $uri =404; }
  location / { return 301 https://$host$request_uri; }
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name ${serverNames};

  ssl_certificate     /etc/letsencrypt/live/${primary}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${primary}/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  client_max_body_size 25m;
  gzip on; gzip_types text/css application/javascript application/json image/svg+xml;

  location / {
    ${backendLocation}
  }

  location /_next/static/ {
    ${framework === "STATIC" ? `root ${root};` : `proxy_pass http://127.0.0.1:${cfg.port};`}
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}
`;
    await fs.writeFile(`/etc/nginx/sites-available/${primary}`, httpsVhost, "utf8");
    await run(deploymentId, "nginx", `nginx -t && nginx -s reload`);

    await finishDeploy(deploymentId, "READY", null, Date.now() - startedAt);
  } catch (e) {
    const err = e as Error;
    await appendLog(deploymentId, "error", err.message);
    await finishDeploy(deploymentId, "ERROR", err.message, Date.now() - startedAt);
    throw e;
  }
}

async function exists(path: string): Promise<boolean> {
  try { await fs.stat(path); return true; } catch { return false; }
}

async function setStatus(deploymentId: string, status: string): Promise<void> {
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status: status as never, startedAt: new Date() },
  }).catch(() => {});
}

async function finishDeploy(deploymentId: string, status: "READY" | "ERROR", errorMessage: string | null, durationMs?: number): Promise<void> {
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { status, errorMessage: errorMessage ?? null, finishedAt: new Date(), durationMs: durationMs ?? null },
  }).catch(() => {});
}

async function appendLog(deploymentId: string, stream: string, message: string): Promise<void> {
  const max = (await prisma.deploymentLog.findFirst({ where: { deploymentId }, orderBy: { seq: "desc" }, select: { seq: true } }))?.seq ?? 0;
  await prisma.deploymentLog.create({
    data: { deploymentId, seq: max + 1, stream, message },
  }).catch(() => {});
}

async function run(deploymentId: string, stream: string, cmd: string): Promise<void> {
  await appendLog(deploymentId, stream, `$ ${cmd.length > 200 ? cmd.slice(0, 200) + "…" : cmd}`);
  return new Promise((resolve, reject) => {
    const p = spawn("bash", ["-c", cmd], { stdio: ["ignore", "pipe", "pipe"] });
    let buffer = "";
    const flush = async () => {
      if (!buffer) return;
      const lines = buffer.split("\n").filter((l) => l.trim());
      buffer = "";
      for (const l of lines.slice(-10)) {
        await appendLog(deploymentId, stream, l);
      }
    };
    p.stdout.on("data", (d) => { buffer += d.toString(); });
    p.stderr.on("data", (d) => { buffer += d.toString(); });
    p.on("close", async (code) => {
      await flush();
      if (code === 0) resolve();
      else reject(new Error(`${stream} failed (exit ${code})`));
    });
    p.on("error", reject);
  });
}
