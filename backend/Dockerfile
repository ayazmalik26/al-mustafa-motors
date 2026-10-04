# syntax=docker/dockerfile:1
# Al-Mustafa Motors API — production image

FROM node:24-bookworm-slim AS build
WORKDIR /app
# Prisma's schema/config are needed by the postinstall `prisma generate`.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=uploads
WORKDIR /app
COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/generated ./src/generated
RUN mkdir -p uploads/vehicles && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
