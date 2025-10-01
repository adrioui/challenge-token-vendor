# syntax=docker.io/docker/dockerfile:1

FROM node:20.18.0-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
WORKDIR /app

ENV YARN_ENABLE_IMMUTABLE_INSTALLS=true

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages/nextjs/package.json ./packages/nextjs/package.json
COPY packages/hardhat/package.json ./packages/hardhat/package.json

RUN corepack enable && yarn install --immutable

FROM base AS builder
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/nextjs/node_modules ./packages/nextjs/node_modules
COPY --from=deps /app/packages/hardhat/node_modules ./packages/hardhat/node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock

COPY . .

RUN corepack enable && yarn next:build

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/packages/nextjs/public ./packages/nextjs/public
COPY --from=builder /app/packages/nextjs/.next/standalone ./
COPY --from=builder /app/packages/nextjs/.next/static ./packages/nextjs/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" > /dev/null || exit 1

CMD ["node", "packages/nextjs/server.js"]
