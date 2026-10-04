# syntax=docker/dockerfile:1
# Al-Mustafa Motors website (Angular SSR) — production image

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:node

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    SSR_PORT=4000 \
    API_INTERNAL_URL=http://backend:3000
WORKDIR /app
# The server bundle is self-contained (no node_modules needed at runtime).
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/frontend/server/server.mjs"]
