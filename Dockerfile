FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy compiled TypeScript + static web UI
COPY dist/ ./dist/
COPY web/ ./web/
COPY src/database/schema.sql ./dist/database/schema.sql

EXPOSE 3001

CMD ["node", "dist/server.js"]
