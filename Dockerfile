# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS builder

ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

RUN apk add --no-cache python3 make g++ sqlite

COPY package.json pnpm-lock.yaml ./
RUN pnpm config set store-dir /pnpm/store
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build
# Prune dev dependencies if possible or just rely on output

FROM ${NODE_IMAGE}

WORKDIR /app

# Runtime only needs SQLite shared libraries; the native .node files are compiled in the builder stage.
RUN apk add --no-cache sqlite-libs

COPY --from=builder /app/.output ./.output

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
