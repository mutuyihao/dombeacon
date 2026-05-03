FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
# Prune dev dependencies if possible or just rely on output

FROM node:22-alpine

WORKDIR /app

# SQLite needs these
RUN apk add --no-cache python3 make g++ sqlite

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package*.json ./

# Install production dependencies for server (if needed by nitro externals, usually bundled)
# But better-sqlite3 might need rebuild or installation in runtime container if bindings differ.
# Safest is to install deps.
RUN npm install --production

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
