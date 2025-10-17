# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
WORKDIR /app

# Install deps only for server
FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || npm install

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN npm pkg delete scripts.dev && npm pkg delete devDependencies && npm install --omit=dev --no-audit --no-fund || true
EXPOSE 4000
CMD ["node", "dist/index.js"]
