# syntax=docker/dockerfile:1.7
# Invoica's container image (decision 0010). Build the app with `--target runner`; build the one-off migration
# image with `--target migrate` and run it, as the owner role, before a new version starts.

ARG NODE_VERSION=22.22.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/documents/package.json packages/documents/
COPY packages/pdf/package.json packages/pdf/
COPY packages/schemas/package.json packages/schemas/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @invoica/web build

# Applies new migrations with DATABASE_OWNER_URL, then exits. It holds the dependencies, the migrations and the
# script that applies them, and nothing else from the repository.
FROM deps AS migrate
COPY packages/db/migrations packages/db/migrations
COPY packages/db/src/migrate.ts packages/db/src/
COPY packages/db/scripts/migrate.ts packages/db/scripts/
USER node
CMD ["packages/db/node_modules/.bin/tsx", "packages/db/scripts/migrate.ts"]

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
# The Chromium that playwright-core pins, with the libraries it needs: PDFs of record come from this one browser.
COPY --from=build /app/packages/pdf/package.json /tmp/pdf.json
RUN npx -y "playwright-core@$(node -p "require('/tmp/pdf.json').dependencies['playwright-core']")" \
      install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm /tmp/pdf.json
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
RUN mkdir -p /var/lib/invoica/files && chown node:node /var/lib/invoica/files
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "apps/web/server.js"]
