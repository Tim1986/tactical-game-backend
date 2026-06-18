FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN cp -r src/db/migrations dist/db/migrations
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
