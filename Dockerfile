FROM node:20-slim

WORKDIR /app

# Install all deps (including devDeps for tsc)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Copy static assets
COPY web/ ./web/
COPY src/database/schema.sql ./dist/database/schema.sql

# Prune dev dependencies
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/server.js"]
