---
name: ec2-docker-deploy-script
overview: Add an EC2 Ubuntu deployment toolkit for this Next.js + Prisma app using Docker Compose (app + order/position workers) with host-level NGINX+Certbot TLS, and provide commands for fresh install, update, logs, and worker restarts with correct startup ordering.
todos:
  - id: add-dockerfile
    content: Add multi-stage `Dockerfile` using corepack+pnpm to build and run Next.js app with Prisma generate.
    status: completed
  - id: add-compose
    content: Add `docker-compose.prod.yml` with `web`, `order-worker`, `position-pnl-worker`, healthchecks, and depends_on ordering.
    status: completed
  - id: add-nginx-template
    content: Add host NGINX site config template for tradebazar.live + www with websocket proxy headers.
    status: completed
  - id: add-deploy-script
    content: Add `deploy/ec2/deploy.sh` implementing setup-ec2, fresh-install, update, logs, restart-workers subcommands (idempotent).
    status: completed
  - id: add-deploy-docs
    content: Add `deploy/ec2/README.md` documenting env setup, commands, and troubleshooting.
    status: completed
isProject: false
---

## Goal

Create a production-ready EC2 (Ubuntu) deployment flow that supports:

- **EC2 bootstrap**: install Docker Engine, Docker Compose v2 plugin, NGINX, Certbot, basic hardening.
- **Fresh install**: clone repo, configure env, build + run containers.
- **Update app**: `git pull` + rebuild/recreate containers.
- **Logs**: tail logs for app and each worker.
- **Restart workers**: restart/update only worker containers.

Constraints/choices locked in from you:

- **DB is external** (no Postgres container).
- **NGINX + Certbot on host** (proxy to Docker on `127.0.0.1:3000`).
- Domain: `**tradebazar.live` + `www.tradebazar.live**`.
- Long-running workers in Docker: **order worker + position PnL worker**.

## What I found in the repo (informs design)

- App is **Next.js 14** with Prisma build step (`package.json` has `build: prisma generate && next build`).
- Readiness endpoint exists and pings DB: `[app/api/ready/route.ts](app/api/ready/route.ts)`.
- Long-running worker entrypoints exist:
  - `[scripts/order-worker.ts](scripts/order-worker.ts)` runs `orderExecutionWorker.processPendingOrders()` in a loop.
  - `[scripts/position-pnl-worker.ts](scripts/position-pnl-worker.ts)` runs `positionPnLWorker.processPositionPnL()` in a loop and **auto-skips** when `position_pnl_mode != server`.

## Files to add/change

- **Docker**
  - `[Dockerfile](Dockerfile)`: multi-stage build using `corepack` + `pnpm`, runs `pnpm build` and `pnpm start`.
  - `[docker-compose.prod.yml](docker-compose.prod.yml)`: services:
    - `web` (bind `127.0.0.1:3000:3000`, healthcheck hits `/api/ready`)
    - `order-worker` (same image, command `pnpm tsx scripts/order-worker.ts`, `depends_on: web: service_healthy`)
    - `position-pnl-worker` (same image, command `pnpm tsx scripts/position-pnl-worker.ts`, `depends_on: web: service_healthy`)
- **EC2 deployment toolkit**
  - `[deploy/ec2/deploy.sh](deploy/ec2/deploy.sh)`: one script with subcommands:
    - `setup-ec2` (docker + compose plugin + nginx + certbot, firewall)
    - `fresh-install` (clone to `/opt/vtrade`, prompt for `.env`, build/up)
    - `update` (git pull + compose build/up)
    - `logs` (service-selectable tail)
    - `restart-workers` (restart worker services)
  - `[deploy/ec2/nginx/tradebazar.live.conf](deploy/ec2/nginx/tradebazar.live.conf)`: NGINX reverse proxy config with websocket headers and sensible timeouts.
  - `[deploy/ec2/README.md](deploy/ec2/README.md)`: copy/paste usage and expected env vars.

## Service ordering (workers start after app)

- In `docker-compose.prod.yml`:
  - `web` has `healthcheck` calling `http://localhost:3000/api/ready` (DB ping).
  - Workers use `depends_on: web:   condition: service_healthy` so they start **only after web is ready**.

## NGINX + TLS flow (host-level)

- `deploy.sh setup-ec2` will:
  - install NGINX + `python3-certbot-nginx`
  - write `/etc/nginx/sites-available/tradebazar.live.conf` from our template
  - enable site and reload NGINX
  - prompt for Let’s Encrypt email, then run Certbot for `tradebazar.live` and `www.tradebazar.live` using `--nginx` installer

## Verification steps (built into README)

- `curl -fsS http://127.0.0.1:3000/api/health` inside EC2 should return `ok`.
- `curl -fsS http://127.0.0.1:3000/api/ready` should return `{ready:true}` once DB is reachable.
- `docker compose -f docker-compose.prod.yml ps` shows `web` healthy and workers running.

## Notes / safe defaults

- **Risk monitoring** stays as cron-triggered endpoint (`/api/cron/risk-monitoring`) since you didn’t select it as a long-running container. (We’ll document an optional host cron example, but won’t enable it by default.)
- `fresh-install` will be written to be **non-destructive by default** (won’t delete volumes); optional `--wipe` flag can be added if you want a true wipe.

