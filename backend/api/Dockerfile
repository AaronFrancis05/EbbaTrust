# EbbaTrust API — multi-stage build.
#
# Stage 1 compiles TypeScript with dev dependencies present. Stage 2 carries only the compiled
# output and production dependencies, so the shipped image contains no compiler, no source and
# no dev tooling. Smaller image, smaller attack surface.

# ---- build ----------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Copy manifests first: this layer is cached until dependencies actually change.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Re-resolve with production dependencies only, for the runtime stage to copy.
RUN npm ci --omit=dev

# ---- runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime

# dumb-init gives PID 1 correct signal handling, so SIGTERM reaches Node and the graceful
# shutdown in server.ts actually runs instead of the pod being killed after the grace period.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

WORKDIR /app

# `node` is an unprivileged user that ships with the base image. Never run this as root.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
