FROM node:20-alpine
WORKDIR /app
# Fail-safe: the app derives isDevelopment from NODE_ENV and DEFAULTS to
# development when unset — which would expose the passwordless /auth/dev-login
# endpoint and debug logging in production. The image is prod-only (local dev
# uses `npm run dev`/tsx), so pin production here regardless of dashboard config.
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY . .
ARG CACHE_BUST=1
RUN echo "Cache bust: $CACHE_BUST"
RUN npm run build
RUN cp -r src/db/migrations dist/db/migrations
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/index.js"]
