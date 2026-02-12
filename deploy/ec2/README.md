# EC2 (Ubuntu) Deployment – Docker + NGINX + Workers

This repo ships a small deployment helper script that provisions an EC2 Ubuntu box and runs **VTrade** with:

- **Docker Compose**: `web` + `order-worker` + `position-pnl-worker`
- **Host-level NGINX + Let’s Encrypt (Certbot)**: terminates TLS and proxies to `127.0.0.1:3000`
- **External DB**: you provide `DATABASE_URL` (RDS/Supabase/managed Postgres)

## Prereqs

- Ubuntu 22.04/24.04 EC2 instance
- DNS A records already created:
  - `tradebazar.live` → EC2 public IP
  - `www.tradebazar.live` → EC2 public IP
- SSH access to the box

## 1) Setup EC2 dependencies (Docker, Compose, NGINX, Certbot)

SSH into EC2 and run:

```bash
sudo apt-get update -y
sudo apt-get install -y git

git clone <YOUR_GIT_REPO_URL> ~/vtrade-bootstrap
cd ~/vtrade-bootstrap

sudo bash deploy/ec2/deploy.sh setup-ec2
```

Notes:
- The setup adds your `sudo` user to the `docker` group. **Log out and log back in** (or reboot) to use docker without sudo.

## Interactive mode (recommended)

You can also run the script with **no arguments** and it will show a menu:

```bash
bash /opt/vtrade/deploy/ec2/deploy.sh
```

## Using an existing repo “in place” (no cloning)

If you already have the repo checked out somewhere (example: `~/vtrade`), **don’t use fresh-install**.
Just create `.env` in that same repo root and run `up`.

```bash
cd ~/vtrade

# 1) Create env file in THIS repo directory
cp .env.example .env
nano .env   # or vi .env

# 2) Build + start using this repo directory
bash deploy/ec2/deploy.sh up --build
```

The script auto-detects `APP_DIR` as the repo you run it from (so `.env` is `./.env`).

## 2) Fresh install (clone to /opt/vtrade and start containers)

```bash
cd ~/vtrade-bootstrap

bash deploy/ec2/deploy.sh fresh-install --repo <YOUR_GIT_REPO_URL> --branch main
```

This will:
- clone to `/opt/vtrade`
- create `/opt/vtrade/.env` from `.env.example` if missing
- **refuse to start** if `.env` still has placeholder values

### Configure `/opt/vtrade/.env`

Edit it and set real values (minimum):
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL=https://tradebazar.live`
- `NEXT_PUBLIC_BASE_URL=https://tradebazar.live`

Then rerun:

```bash
bash /opt/vtrade/deploy/ec2/deploy.sh up --build
```

## 3) Configure NGINX + TLS (Let’s Encrypt)

After DNS is pointing to the EC2 instance:

```bash
sudo bash /opt/vtrade/deploy/ec2/deploy.sh setup-nginx-tls
```

This installs the site config from:
- `deploy/ec2/nginx/tradebazar.live.conf`

and then requests a cert for:
- `tradebazar.live`
- `www.tradebazar.live`

## 4) Update app (git pull + rebuild containers)

```bash
bash /opt/vtrade/deploy/ec2/deploy.sh update --branch main
```

## 5) See logs (app + workers)

```bash
# web only
bash /opt/vtrade/deploy/ec2/deploy.sh logs web

# order worker
bash /opt/vtrade/deploy/ec2/deploy.sh logs order-worker

# pnl worker
bash /opt/vtrade/deploy/ec2/deploy.sh logs position-pnl-worker

# all services
bash /opt/vtrade/deploy/ec2/deploy.sh logs all
```

## 6) Restart / update workers

```bash
# simple restart
bash /opt/vtrade/deploy/ec2/deploy.sh restart-workers

# rebuild + recreate worker containers
bash /opt/vtrade/deploy/ec2/deploy.sh restart-workers --rebuild
```

## Health checks / verification

From the EC2 box:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
```

- `/api/health` should return `{"status":"ok",...}`.\n
- `/api/ready` returns `{"ready":true}` **only when DB connectivity works**.

## Worker behavior notes

- **Order worker** runs continuously in Docker (service `order-worker`). It is soft-toggleable via DB settings (Admin Console → Workers).\n
- **Position PnL worker** runs continuously in Docker (service `position-pnl-worker`) but it **auto-skips** unless DB setting `position_pnl_mode=server`.\n

## Optional: Risk monitoring

This deployment does **not** run risk monitoring as a long-running container. The endpoint exists:
- `GET /api/cron/risk-monitoring` (protected by `CRON_SECRET`)

You can schedule it externally (cron, EventBridge, etc.) to call it every 60 seconds.

## Useful operational commands

```bash
# status (shows web + workers)
bash /opt/vtrade/deploy/ec2/deploy.sh status

# stop services
bash /opt/vtrade/deploy/ec2/deploy.sh down

# start services
bash /opt/vtrade/deploy/ec2/deploy.sh up

# restart everything
bash /opt/vtrade/deploy/ec2/deploy.sh restart all

# restart only the web container
bash /opt/vtrade/deploy/ec2/deploy.sh restart web
```

