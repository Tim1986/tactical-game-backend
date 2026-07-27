FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG CACHE_BUST=1
RUN echo "Cache bust: $CACHE_BUST"
RUN npm run build
RUN cp -r src/db/migrations dist/db/migrations
EXPOSE 3000
# Fail-safe: the app derives isDevelopment from NODE_ENV and DEFAULTS to
# development when unset — which would expose the passwordless /auth/dev-login
# endpoint and debug logging in production. Set this AFTER npm ci / npm run
# build (which need devDependencies like typescript) so only the runtime is
# pinned to production. The image is prod-only (local dev uses `npm run dev`/tsx).
ENV NODE_ENV=production
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/index.js"]
