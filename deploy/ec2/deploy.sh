#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# VTrade EC2 Deployment Helper (Ubuntu)
# -----------------------------------------------------------------------------
# Supports:
#   - setup-ec2: install docker, compose plugin, nginx, certbot, ufw basics
#   - fresh-install: clone repo to /opt/vtrade, set env, build/up containers
#   - update: git pull + rebuild/recreate containers
#   - logs: view service logs
#   - restart-workers: restart worker containers (optionally rebuild)
#
# Assumptions:
#   - External database (RDS/Supabase/etc.)
#   - Host-level NGINX + Certbot terminates TLS and proxies to 127.0.0.1:3000
# -----------------------------------------------------------------------------

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vtrade}"
DOMAIN_APEX="tradebazar.live"
DOMAIN_WWW="www.tradebazar.live"
NGINX_SITE_NAME="tradebazar.live.conf"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

compose() {
  (cd "$APP_DIR" && docker compose -f docker-compose.prod.yml "$@")
}

log() {
  printf '%s\n' "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    die "This command must be run as root (use sudo)."
  fi
}

usage() {
  cat <<'EOF'
Usage:
  deploy/ec2/deploy.sh <command> [options]

Commands:
  setup-ec2
      Install docker engine, compose plugin, nginx, certbot, and basic firewall rules.

  setup-nginx-tls
      Install NGINX site config from template and obtain a TLS cert using Certbot.
      Requires DNS A-records already pointing to this EC2 instance.

  fresh-install [--repo <git-url>] [--branch <name>] [--wipe]
      Clone repo into /opt/vtrade (or $APP_DIR), ensure .env exists, then build+start containers.
      --wipe is destructive: removes $APP_DIR before cloning.

  update [--branch <name>]
      git pull (ff-only) and rebuild/recreate containers.

  logs [service] [--tail <n>]
      Show docker compose logs (default service: web, default tail: 200).
      If service is 'all', shows all services.

  restart-workers [--rebuild]
      Restart order-worker + position-pnl-worker. If --rebuild, rebuild/recreate them.

Environment overrides:
  APP_DIR=/opt/vtrade

EOF
}

detect_repo_url() {
  # Best-effort: if script is invoked from within a git clone, use remote origin.
  if command -v git >/dev/null 2>&1; then
    git -C "$(pwd)" config --get remote.origin.url 2>/dev/null || true
  fi
}

ensure_env_file() {
  local envPath="$APP_DIR/.env"

  if [[ -f "$envPath" ]]; then
    return 0
  fi

  if [[ -f "$APP_DIR/.env.example" ]]; then
    log "⚠️  .env not found. Creating from .env.example at: $envPath"
    cp "$APP_DIR/.env.example" "$envPath"
    log "IMPORTANT: Edit $envPath and set real secrets (DATABASE_URL, NEXTAUTH_SECRET, etc.) before going live."
    return 0
  fi

  die "No .env or .env.example found in $APP_DIR"
}

assert_env_sane() {
  local envPath="$APP_DIR/.env"
  [[ -f "$envPath" ]] || die "Missing .env at $envPath"

  # Minimal required keys for production boot.
  local requiredKeys=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "NEXT_PUBLIC_BASE_URL")
  local missing=()
  for k in "${requiredKeys[@]}"; do
    if ! grep -Eq "^${k}=" "$envPath"; then
      missing+=("$k")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    die ".env is missing required keys: ${missing[*]}. Edit $envPath and re-run."
  fi

  # Guardrail against placeholders copied from .env.example.
  if grep -Eqi 'your-(database-url|nextauth-secret|supabase-url|supabase-anon-key|service-role-key|vortex-api-url|vortex-api-key)-here' "$envPath"; then
    die ".env still contains placeholder values (your-*-here). Edit $envPath and re-run."
  fi

  # Guardrail against local URLs in production.
  if grep -Eq '^NEXTAUTH_URL=http://localhost' "$envPath"; then
    die ".env has NEXTAUTH_URL=http://localhost... Set it to https://$DOMAIN_APEX and re-run."
  fi
  if grep -Eq '^NEXT_PUBLIC_BASE_URL=http://localhost' "$envPath"; then
    die ".env has NEXT_PUBLIC_BASE_URL=http://localhost... Set it to https://$DOMAIN_APEX and re-run."
  fi
}

setup_ec2() {
  require_root

  export DEBIAN_FRONTEND=noninteractive

  log "Updating apt index..."
  apt-get update -y

  log "Installing base packages..."
  apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg lsb-release git ufw

  if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker Engine + Compose plugin..."

    install -m 0755 -d /etc/apt/keyrings
    if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      chmod a+r /etc/apt/keyrings/docker.gpg
    fi

    local codename
    codename="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${codename} stable" \
      > /etc/apt/sources.list.d/docker.list

    apt-get update -y
    apt-get install -y --no-install-recommends \
      docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
    log "Docker already installed. Skipping."
  fi

  systemctl enable --now docker

  # Allow the invoking sudo user to run docker without sudo (after re-login).
  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    usermod -aG docker "${SUDO_USER}" || true
  fi

  log "Installing NGINX + Certbot..."
  apt-get install -y --no-install-recommends nginx certbot python3-certbot-nginx
  systemctl enable --now nginx

  log "Configuring firewall (UFW)..."
  ufw allow OpenSSH >/dev/null || true
  ufw allow "Nginx Full" >/dev/null || true
  ufw --force enable >/dev/null || true

  log "✅ EC2 setup complete."
  log "Next: run fresh-install, then run: sudo $APP_DIR/deploy/ec2/deploy.sh setup-nginx-tls"
}

install_nginx_site_and_tls() {
  require_root

  local tpl
  tpl="$APP_DIR/deploy/ec2/nginx/tradebazar.live.conf"
  if [[ ! -f "$tpl" ]]; then
    tpl="$REPO_ROOT/deploy/ec2/nginx/tradebazar.live.conf"
  fi
  [[ -f "$tpl" ]] || die "NGINX template not found: $tpl"

  log "Installing NGINX site config: $NGINX_SITE_NAME"
  cp "$tpl" "/etc/nginx/sites-available/$NGINX_SITE_NAME"

  # Disable default site if present
  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  ln -sf "/etc/nginx/sites-available/$NGINX_SITE_NAME" "/etc/nginx/sites-enabled/$NGINX_SITE_NAME"

  nginx -t
  systemctl reload nginx

  local email
  read -r -p "Let's Encrypt email (for renewal notices): " email
  [[ -n "$email" ]] || die "Email is required for Let's Encrypt."

  log "Requesting TLS certificate via Certbot..."
  certbot --nginx \
    -d "$DOMAIN_APEX" -d "$DOMAIN_WWW" \
    --non-interactive --agree-tos -m "$email" \
    --redirect

  log "✅ TLS configured for $DOMAIN_APEX and $DOMAIN_WWW"
}

fresh_install() {
  local repoUrl=""
  local branch="main"
  local wipe="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --repo)
        repoUrl="${2:-}"; shift 2
        ;;
      --branch)
        branch="${2:-}"; shift 2
        ;;
      --wipe)
        wipe="true"; shift 1
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done

  need_cmd git
  need_cmd docker

  if [[ -z "$repoUrl" ]]; then
    repoUrl="$(detect_repo_url)"
  fi
  [[ -n "$repoUrl" ]] || die "Repo URL not provided. Use: fresh-install --repo <git-url>"

  if [[ "$wipe" == "true" ]]; then
    log "⚠️  Wiping $APP_DIR (destructive)..."
    sudo rm -rf "$APP_DIR"
  fi

  if [[ -d "$APP_DIR/.git" ]]; then
    log "Repo already present at $APP_DIR. Skipping clone."
  else
    log "Cloning repo to $APP_DIR..."
    sudo mkdir -p "$APP_DIR"
    sudo chown -R "$(id -u):$(id -g)" "$APP_DIR"
    git clone --branch "$branch" --depth 1 "$repoUrl" "$APP_DIR"
  fi

  ensure_env_file
  assert_env_sane

  log "Building and starting containers..."
  compose build --pull
  compose up -d --remove-orphans

  log "✅ Fresh install complete."
  log "Check readiness: curl -fsS http://127.0.0.1:3000/api/ready"
  log "Check containers: docker compose -f $APP_DIR/docker-compose.prod.yml ps"
  log "Then configure TLS (after DNS is ready): sudo $APP_DIR/deploy/ec2/deploy.sh setup-nginx-tls"
}

update_app() {
  local branch="main"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --branch)
        branch="${2:-}"; shift 2
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done

  need_cmd git
  need_cmd docker

  [[ -d "$APP_DIR/.git" ]] || die "App not found at $APP_DIR. Run fresh-install first."

  log "Updating repo (ff-only)..."
  git -C "$APP_DIR" fetch --all --prune
  git -C "$APP_DIR" checkout "$branch"
  git -C "$APP_DIR" pull --ff-only

  log "Rebuilding and restarting containers..."
  compose build --pull
  compose up -d --remove-orphans

  log "✅ Update complete."
}

show_logs() {
  local service="${1:-web}"
  local tail="200"

  shift 1 || true
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tail)
        tail="${2:-200}"; shift 2
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done

  need_cmd docker

  if [[ "$service" == "all" ]]; then
    compose logs --follow --tail "$tail"
    return 0
  fi

  compose logs --follow --tail "$tail" "$service"
}

restart_workers() {
  local rebuild="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --rebuild)
        rebuild="true"; shift 1
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done

  need_cmd docker

  if [[ "$rebuild" == "true" ]]; then
    log "Rebuilding worker services..."
    compose up -d --no-deps --build order-worker position-pnl-worker
  else
    log "Restarting worker services..."
    compose restart order-worker position-pnl-worker
  fi

  log "✅ Workers updated/restarted."
}

main() {
  local cmd="${1:-}"
  shift || true

  case "$cmd" in
    setup-ec2)
      setup_ec2 "$@"
      ;;
    setup-nginx-tls)
      install_nginx_site_and_tls "$@"
      ;;
    fresh-install)
      fresh_install "$@"
      ;;
    update)
      update_app "$@"
      ;;
    logs)
      show_logs "$@"
      ;;
    restart-workers)
      restart_workers "$@"
      ;;
    help|--help|-h|"")
      usage
      ;;
    *)
      die "Unknown command: $cmd"
      ;;
  esac
}

main "$@"

