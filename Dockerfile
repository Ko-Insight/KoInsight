# Builder
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json .
COPY package-lock.json .
COPY apps/server/package.json ./apps/server/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/common/package.json ./packages/common/package.json

RUN npm ci

COPY turbo.json .
COPY apps ./apps
COPY packages ./packages

RUN npm run build

# Runner
FROM node:22-alpine AS runner

WORKDIR /app
RUN mkdir -p /app/data

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/server/dist /app/apps/server/dist
COPY --from=builder /app/apps/web/dist /app/apps/web/dist
COPY plugins ./plugins

ENV NODE_ENV="production"
ENV HOSTNAME="0.0.0.0"
ENV DATA_PATH="/app/data"
ENV MAX_FILE_SIZE_MB="100"

CMD ["node", "./apps/server/dist/app.js"]
