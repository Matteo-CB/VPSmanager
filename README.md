# VPS Manager

Panel d'administration privé pour piloter le VPS (sites, déploiements, DNS, services, firewall, bases de données, logs, terminal root).

Stack : Next.js 15 (App Router) · React 19 · TypeScript · Prisma + Postgres · NextAuth · Redis · Tailwind-less (CSS variables).

## Se connecter

- URL : **https://console.hiddenlab.fr**
- Email : `matteo.biyikli3224@gmail.com`
- Mot de passe : _(communiqué en privé — à changer après première connexion)_

Deux rôles :
- **ADMIN** : accès complet (terminal root, fichiers, déploiements, modification DB).
- **USER** : lecture seule sur les écrans opérationnels, pas d'accès aux fichiers ni au terminal root.

## Développement local

```bash
pnpm install
cp .env.local.sample .env.local  # remplir les valeurs (voir ci-dessous)
pnpm db:push                      # crée le schéma
pnpm db:seed                      # utilisateurs + données initiales
pnpm dev                          # http://localhost:3000
```

### Variables d'environnement (`.env.local`)

```env
DATABASE_URL="postgresql://vpsmgr:vpsmgr@127.0.0.1:5433/vps_manager"
REDIS_URL="redis://127.0.0.1:6380"
AUTH_SECRET="<64 hex — openssl rand -hex 64>"
NEXTAUTH_URL="http://localhost:3000"
SECRETS_MASTER_KEY="<32 bytes hex — openssl rand -hex 32>"
STRIPE_SECRET_KEY="sk_live_..."   # optionnel
```

## Déploiement VPS

```bash
VPS_HOST=<ip> VPS_PASSWORD=<root-pwd> pnpm tsx scripts/deploy-vps.ts
```

Le script uploade un tarball, (re)crée les containers Postgres/Redis, installe les deps, build, écrit le service systemd `vps-manager.service` et vérifie l'écoute sur `127.0.0.1:3005`.

## Structure

- `app/` — routes Next.js (API sous `app/api/`).
- `components/` — UI React (shell, screens, primitives).
- `lib/` — logique serveur (rbac, prisma, env, deployer, crypto, stripe…).
- `prisma/` — schéma et seed.
- `scripts/` — `deploy-vps.ts`, `deploy-site.ts`, `setup-subdomain.ts`, `reset-reseed.ts`.
