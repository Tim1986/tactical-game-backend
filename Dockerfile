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
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/index.js"]
