# ----- Builder -----
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DB_DRIVER=RDS
ENV STORAGE_DRIVER=S3
ENV RDS_ENDPOINT=localhost
ENV RDS_USER=build
ENV RDS_PASSWORD=build
ENV RDS_DB=build
ENV JWT_SECRET=build-secret
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  else npm i; fi

COPY . .
RUN npm run build

# ----- Runner -----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]