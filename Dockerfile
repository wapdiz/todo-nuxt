FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN npx --no-install nuxt prepare && npm run build:server

FROM node:22-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    IS_PROD=true \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000

COPY --from=build --chown=node:node /app/output ./output

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "output/server/index.mjs"]
