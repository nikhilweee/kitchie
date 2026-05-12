FROM node:24-slim AS builder

RUN corepack enable pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN DATABASE_URL=":memory:" pnpm build
# Prune dev dependencies
RUN pnpm prune --prod

# ---------------------------------------------------------------------------

FROM node:24-slim

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle

# SQLite database lives in /app/data (mounted as a volume)
RUN mkdir -p /app/data

LABEL org.opencontainers.image.source=https://github.com/nikhilweee/kitchie

ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/kitchie.db

EXPOSE 3000
CMD ["node", "build"]
