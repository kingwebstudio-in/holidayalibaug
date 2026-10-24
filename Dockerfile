# Production image for HolidayAlibag (Express API + built React frontend on one origin).
# Works on any container host (Render, Railway, Fly.io, Google Cloud Run, DigitalOcean App Platform, a VPS with Docker…).
# NOTE: this file was written but could not be built in the authoring sandbox (no Docker there) — run `docker build .` once
# before relying on it.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:all && npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/migrations ./server/migrations
USER node
EXPOSE 4000
ENV PORT=4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/index.js"]
