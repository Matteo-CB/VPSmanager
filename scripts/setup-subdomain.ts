

import { Client, type ClientChannel } from "ssh2";

const host = process.env.VPS_HOST!;
const user = process.env.VPS_USER || "root";
const password = process.env.VPS_PASSWORD!;

const SUBDOMAIN = process.env.PANEL_SUBDOMAIN || "console.daikicorp.fr";
const BACKEND = "http://127.0.0.1:3005";
const VPS_IP = "82.165.93.135";

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
  await new Promise<void>((r, j) => c.on("ready", r).on("error", j).connect({ host, username: user, password, readyTimeout: 10000 }));

  console.log(`\n==== 1. Check DNS for ${SUBDOMAIN} ====`);
  const dns = await run(c, `dig +short ${SUBDOMAIN} A @1.1.1.1`, { silent: true });
  const resolved = dns.out.trim().split("\n").filter(Boolean);
  const dnsOk = resolved.includes(VPS_IP);
  console.log(`DNS: ${resolved.length ? resolved.join(", ") : "(no record)"} ${dnsOk ? "✅ points to VPS" : "❌ not pointing to VPS"}`);

  console.log(`\n==== 2. Write nginx vhost ${SUBDOMAIN} ====`);
  const httpVhost = `# Managed by VPS Manager · do not edit via Plesk
server {
    listen 80;
    listen [::]:80;
    server_name ${SUBDOMAIN};

    # Let's Encrypt HTTP-01 challenge
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    location / {
        proxy_pass ${BACKEND};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;

        # Hide panel from crawlers
        add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex" always;
    }
}
`;
  await run(c, `mkdir -p /var/www/html/.well-known/acme-challenge`);
  await run(c, `cat > /etc/nginx/sites-available/${SUBDOMAIN} <<'__NGX_EOF__'
${httpVhost}__NGX_EOF__`);
  await run(c, `ln -sfn /etc/nginx/sites-available/${SUBDOMAIN} /etc/nginx/sites-enabled/${SUBDOMAIN}`);

  console.log(`\n==== 3. Test + reload nginx ====`);
  const test = await run(c, `nginx -t 2>&1`);
  if (test.code !== 0) {
    console.error("❌ nginx -t failed, rolling back");
    await run(c, `rm -f /etc/nginx/sites-enabled/${SUBDOMAIN} /etc/nginx/sites-available/${SUBDOMAIN}`);
    process.exit(1);
  }
  await run(c, `nginx -s reload`);

  if (!dnsOk) {
    console.log(`\n⏸  SSL skipped · DNS not set yet.

Ajoute ce record chez ton registrar de daikicorp.fr :

   Type:  A
   Name:  console
   Value: ${VPS_IP}
   TTL:   300 (5 min)

Puis relance ce script :
   VPS_HOST=${VPS_IP} VPS_USER=root VPS_PASSWORD=... pnpm tsx scripts/setup-subdomain.ts

Le panel est déjà accessible en HTTP via le tunnel SSH ou une fois le DNS propagé : http://${SUBDOMAIN}
`);
    c.end(); return;
  }

  console.log(`\n==== 4. Provision SSL via certbot ====`);

  const certExists = await run(c, `test -d /etc/letsencrypt/live/${SUBDOMAIN} && echo YES || echo NO`, { silent: true });
  if (certExists.out.trim() === "YES") {
    console.log(`  ✓ Cert already exists for ${SUBDOMAIN}, reconfiguring nginx for HTTPS`);
  } else {
    const cb = await run(c, `certbot certonly --nginx -d ${SUBDOMAIN} --non-interactive --agree-tos --email admin@daikicorp.fr 2>&1`, { timeout: 180000 });
    if (cb.code !== 0) {
      console.error("❌ certbot failed. Panel reste en HTTP. Vérifie les logs ci-dessus.");
      c.end(); return;
    }
  }

  const httpsVhost = `# Managed by VPS Manager
server {
    listen 80;
    listen [::]:80;
    server_name ${SUBDOMAIN};

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${SUBDOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${SUBDOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${SUBDOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Hardening
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex" always;

    client_max_body_size 25m;

    location / {
        proxy_pass ${BACKEND};
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
}
`;
  await run(c, `cat > /etc/nginx/sites-available/${SUBDOMAIN} <<'__NGX_EOF__'
${httpsVhost}__NGX_EOF__`);
  const test2 = await run(c, `nginx -t 2>&1`);
  if (test2.code !== 0) { console.error("❌ nginx -t failed after HTTPS rewrite"); process.exit(1); }
  await run(c, `nginx -s reload`);

  console.log(`\n==== 5. Update NEXTAUTH_URL + restart vps-manager ====`);
  await run(c, `sed -i 's|^NEXTAUTH_URL=.*|NEXTAUTH_URL="https://${SUBDOMAIN}"|' /opt/vps-manager/.env.local`);
  await run(c, `grep NEXTAUTH_URL /opt/vps-manager/.env.local`);
  await run(c, `systemctl restart vps-manager && sleep 3 && systemctl status vps-manager --no-pager | head -8`);

  console.log(`\n==== 6. Verify HTTPS ====`);
  await run(c, `curl -fsS -o /dev/null -w 'HTTP %{http_code} on https://${SUBDOMAIN}/login\\n' https://${SUBDOMAIN}/login --resolve ${SUBDOMAIN}:443:127.0.0.1`);

  c.end();
  console.log(`\n✅ Terminé. Le panel est accessible sur https://${SUBDOMAIN}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
