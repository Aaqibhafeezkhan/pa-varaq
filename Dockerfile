# Multi-target build for the Pa-Varaq monorepo: `api` and `web`.
# Override NODE_IMAGE if Docker Hub is unreachable (e.g. a registry mirror).
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && touch /app/.env && chown -R node:node /app
USER node

FROM base AS api
RUN pnpm --filter @varaq/api db:generate
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
# Apply migrations, seed (idempotent), then start the server.
CMD ["sh", "-c", "pnpm --filter @varaq/api db:deploy && pnpm --filter @varaq/api db:seed && pnpm --filter @varaq/api start"]

FROM base AS web
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @varaq/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@varaq/web", "start"]
