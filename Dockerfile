# Multi-target build for the Pa-Varaq monorepo: `api` and `web`.
# Override NODE_IMAGE if Docker Hub is unreachable (e.g. a registry mirror).
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS base
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@12
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS api
RUN pnpm --filter @varaq/api db:generate
EXPOSE 4000
# Apply migrations, seed (idempotent), then start the server.
CMD ["sh", "-c", "pnpm --filter @varaq/api db:deploy && pnpm --filter @varaq/api db:seed && pnpm --filter @varaq/api start"]

FROM base AS web
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @varaq/web build
EXPOSE 3000
CMD ["pnpm", "--filter", "@varaq/web", "start"]
