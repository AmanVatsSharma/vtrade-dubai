# ------------------------------------------------------------
# VTrade Production Dockerfile (Next.js + Prisma + Workers)
# ------------------------------------------------------------
# - Builds the Next.js app (`pnpm build` -> `next build`)
# - Includes TS sources needed by long-running workers executed via `pnpm tsx`
# - Uses pnpm via Corepack
# ------------------------------------------------------------

FROM node:20-bookworm-slim AS base

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Prisma query engine requires OpenSSL at runtime on Debian-based images.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml ./

# Install all deps to build (includes `prisma` CLI in devDependencies).
RUN pnpm install --frozen-lockfile

FROM base AS build

COPY --from=deps /app/node_modules /app/node_modules
COPY . .

RUN pnpm build

# Reduce size: keep production deps only.
RUN pnpm prune --prod

FROM base AS runtime

WORKDIR /app

# Copy the built app, pruned node_modules, and TS sources (for workers).
COPY --from=build /app /app

EXPOSE 3000

CMD ["pnpm", "start"]

