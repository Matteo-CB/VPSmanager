import { Client } from "ssh2";

const script = `
set -e
cd /opt/vps-manager
echo '=== Reset DB (destroys + recreates schema) ==='
pnpm db:push --force-reset --accept-data-loss 2>&1 | tail -10

echo ''
echo '=== Seed ==='
pnpm db:seed 2>&1 | tail -5

echo ''
echo '=== Users after seed ==='
docker exec vpsmgr-postgres psql -U vpsmgr -d vps_manager -c 'SELECT email, role, LENGTH("passwordHash") FROM "User"'

echo ''
echo '=== Restart service ==='
systemctl restart vps-manager
sleep 3
systemctl is-active vps-manager

echo ''
echo '=== Health check ==='
curl -fsS -o /dev/null -w 'login -> %{http_code}\\n' https://console.hiddenlab.fr/login
`;

const c = new Client();
c.on("ready", () => {
  c.exec(script, { pty: false }, (err, s) => {
    if (err) { console.error(err); process.exit(1); }
    s.on("close", () => { c.end(); process.exit(0); })
      .on("data", (d: Buffer) => process.stdout.write(d.toString()))
      .stderr.on("data", (d: Buffer) => process.stderr.write(d.toString()));
  });
}).on("error", (e) => { console.error(e); process.exit(1); })
  .connect({ host: process.env.VPS_HOST!, username: "root", password: process.env.VPS_PASSWORD!, readyTimeout: 10000 });
