FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
# Prune dev dependencies
RUN npm prune --production

# ---------------------------------------------------------------------------

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# SQLite database lives in /app/data (mounted as a volume)
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/kitchie.db

EXPOSE 3000
CMD ["node", "build"]
