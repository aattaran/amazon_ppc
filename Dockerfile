FROM node:20-alpine

# Native module build toolchain (required by better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install dependencies (includes devDependencies for TypeScript build)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source and compile
COPY . .
RUN npm run build

# Prune devDependencies for production image
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/server.js"]
