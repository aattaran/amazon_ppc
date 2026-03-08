FROM node:20-alpine

# Native module build toolchain (required by better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy everything first (single COPY avoids stale split-layer cache issues)
COPY . .

# Install all dependencies (devDeps needed for TypeScript compilation)
RUN npm ci

# Compile TypeScript + postbuild copies schema.sql and src/titan/ to dist/
RUN npm run build

# Prune devDependencies for production image
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/server.js"]
