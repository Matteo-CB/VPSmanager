

import { Client, type ClientChannel } from "ssh2";

const host = process.env.VPS_HOST!;
const user = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD!;

const CFG = {
  slug: process.env.SITE_SLUG || "hiddenlab",
  repo: process.env.SITE_REPO || "git@github.com:Matteo-CB/my-agency.git",
  branch: process.env.SITE_BRANCH || "main",
  primaryDomain: process.env.SITE_DOMAIN || "hiddenlab.fr",
  wwwAlias: (process.env.SITE_WWW ?? "true") !== "false",
  port: Number(process.env.SITE_PORT || 3006),
  email: process.env.SITE_EMAIL || "admin@hiddenlab.fr",
};
const REMOTE_ROOT = `/opt/sites/${CFG.slug}`;
const UNIT = `site-${CFG.slug}.service`;

function run(c: Client, cmd: string, opts: { silent?: boolean; timeout?: number } = {}): Promise<{ code: number; out: string }> {
  return new Promise((resolve, reject) => {
    let out = "";
    const t = setTimeout(() => reject(new Error(`timeout: ${cmd.slice(0, 80)}`)), opts.timeout ?? 120000);
    c.exec(cmd, { pty: false }, (err: Error | undefined, stream: ClientChannel) => {
      if (err) { clearTimeout(t); return reject(err); }
      stream
        .on("close", (code: number) => { clearTimeout(t); resolve({ code, out }); })
        .on("data", (d: Buffer) => { const s = d.toString(); out += s; if (!opts.silent) process.stdout.write(s); })
        .stderr.on("data", (d: Buffer) => { const s = d.toString(); out += s; if (!opts.silent) process.stderr.write(s); });
    });
  });
}

async function main() {
  const c = new Client();
  await new Promise<void>((r, j) => c.on("ready", r).on("error", j).connect({ host, username: user, password, readyTimeout: 15000 }));

  const hosts = [CFG.primaryDomain, ...(CFG.wwwAlias ? [`www.${CFG.primaryDomain}`] : [])];

  console.log(`\n==== 1. DNS check ====`);
  for (const h of hosts) {
    const r = await run(c, `dig +short ${h} A @1.1.1.1 | head -1`, { silent: true });
    console.log(`  ${h} -> ${r.out.trim() || "(none)"}`);
  }

  console.log(`\n==== 2. Clone / pull repo ====`);
  await run(c, `mkdir -p ${REMOTE_ROOT} && cd ${REMOTE_ROOT} && ( \
    if [ -d .git ]; then git fetch origin && git reset --hard origin/${CFG.branch}; \
    else git clone -b ${CFG.branch} ${CFG.repo} . ; fi \
  )`, { timeout: 180000 });

  console.log(`\n==== 3. Install deps ====`);

  await run(c, `cd ${REMOTE_ROOT} && pnpm install --prod=false --ignore-scripts 2>&1 | tail -10`, { timeout: 600000 });

  console.log(`\n==== 4. Build ====`);
  await run(c, `cd ${REMOTE_ROOT} && pnpm run build 2>&1 | tail -30`, { timeout: 600000 });

  console.log(`\n==== 5. systemd unit (${UNIT}) ====`);
  const unitContent = `[Unit]
Description=Site ${CFG.slug} (Next.js, port ${CFG.port})
After=network.target
[Service]
Type=simple
WorkingDirectory=${REMOTE_ROOT}
Environment=NODE_ENV=production
Environment=PORT=${CFG.port}
Environment=HOSTNAME=127.0.0.1
ExecStart=/usr/bin/pnpm exec next start -p ${CFG.port} -H 127.0.0.1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
User=root
[Install]
WantedBy=multi-user.target
`;
  await run(c, `cat > /etc/systemd/system/${UNIT} <<'__UNIT_EOF__'
${unitContent}__UNIT_EOF__
systemctl daemon-reload
systemctl enable ${UNIT}
systemctl restart ${UNIT}
sleep 2
systemctl status ${UNIT} --no-pager | head -10`);

  console.log(`\n==== 6. Wait for backend readiness ====`);
  await run(c, `for i in 1 2 3 4 5 6 7 8 9 10 11 12; do \
    if curl -fsS -o /dev/null http://127.0.0.1:${CFG.port}/ 2>/dev/null; then echo "backend OK after \${i}s"; break; fi; \
    sleep 1; \
  done`);

  console.log(`\n==== 7. nginx vhost (HTTP first) ====`);
  const serverNames = hosts.join(" ");
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
        proxy_pass http://127.0.0.1:${CFG.port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
`;
  await run(c, `mkdir -p /var/www/html/.well-known/acme-challenge && cat > /etc/nginx/sites-available/${CFG.primaryDomain} <<'__NGX_EOF__'
${httpVhost}__NGX_EOF__
ln -sfn /etc/nginx/sites-available/${CFG.primaryDomain} /etc/nginx/sites-enabled/${CFG.primaryDomain}
nginx -t 2>&1 | tail -3
nginx -s reload`);

  console.log(`\n==== 8. Provision SSL (certbot) ====`);
  const dFlags = hosts.map((h) => `-d ${h}`).join(" ");
  const certExists = await run(c, `test -d /etc/letsencrypt/live/${CFG.primaryDomain} && echo YES || echo NO`, { silent: true });
  if (certExists.out.trim() !== "YES") {
    const cb = await run(c, `certbot certonly --webroot -w /var/www/html ${dFlags} --non-interactive --agree-tos --email ${CFG.email} 2>&1`, { timeout: 180000 });
    if (cb.code !== 0) {
      console.error("❌ certbot failed, le site reste en HTTP. Logs ci-dessus.");
      c.end(); return;
    }
  } else {
    console.log("  ✓ cert exists, skip issuance");
  }

  console.log(`\n==== 9. Rewrite nginx vhost (HTTPS) ====`);
  const httpsVhost = `# Managed by VPS Manager
server {
    listen 80;
    listen [::]:80;
    server_name ${serverNames};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${serverNames};

    ssl_certificate     /etc/letsencrypt/live/${CFG.primaryDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${CFG.primaryDomain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 25m;
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:${CFG.port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Long cache for Next.js static assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:${CFG.port};
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
`;
  await run(c, `cat > /etc/nginx/sites-available/${CFG.primaryDomain} <<'__NGX_EOF__'
${httpsVhost}__NGX_EOF__
nginx -t 2>&1 | tail -3
nginx -s reload`);

  console.log(`\n==== 10. Verify ====`);
  for (const h of hosts) {
    await run(c, `curl -fsS -o /dev/null -w 'HTTP %{http_code} on https://${h}/\\n' https://${h}/ -H 'User-Agent: vps-manager-check' || echo 'failed'`);
  }

  c.end();
  console.log(`\n✅ ${CFG.slug} déployé sur https://${CFG.primaryDomain}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
