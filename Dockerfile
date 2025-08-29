# Ortmeier Job Management - Production Dockerfile for Coolify
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Cache bust for RBAC fixes
ARG CACHE_BUST=1
COPY . .

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy values for build time only (will be overridden at runtime)
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DB_DRIVER=RDS
ENV STORAGE_DRIVER=S3
ENV RDS_PROXY_ENDPOINT=localhost
ENV RDS_ENDPOINT=localhost
ENV RDS_DB=build
ENV RDS_USER=build
ENV RDS_PASSWORD=build
ENV S3_BUCKET=build-bucket
ENV S3_REGION=us-east-2
ENV JWT_SECRET=build-secret
ENV NEXTAUTH_SECRET=build-secret
ENV NEXTAUTH_URL=http://localhost:3000

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy healthcheck script
COPY --from=builder --chown=nextjs:nodejs /app/healthcheck.js ./healthcheck.js

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "server.js"]