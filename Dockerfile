# ------------------------------------------------------------
# VTrade Production Dockerfile (Next.js + Prisma + Workers)
# ------------------------------------------------------------
# - Builds the Next.js app (`npm run build` -> `prisma generate && next build`)
# - Includes TS sources needed by long-running workers executed via npm scripts (`tsx ...`)
# - Uses npm (`package-lock.json`)
# ------------------------------------------------------------

FROM node:20-bookworm-slim AS base

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Prisma query engine requires OpenSSL at runtime on Debian-based images.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./

# IMPORTANT:
# - This repo runs `prisma generate` in `postinstall`.
# - In the deps layer we only copy package.json + lockfile, so Prisma schema isn't present yet.
# - Therefore install deps without scripts here; Prisma generation happens during the build stage.
RUN npm ci --ignore-scripts

FROM base AS build

COPY --from=deps /app/node_modules /app/node_modules
COPY . .

RUN npm run build

# Reduce size: keep production deps only.
RUN npm prune --omit=dev

FROM base AS runtime

WORKDIR /app

# Copy the built app, pruned node_modules, and TS sources (for workers).
COPY --from=build /app /app

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]

