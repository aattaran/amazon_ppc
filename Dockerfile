FROM node:20-slim

WORKDIR /app

# Install all deps first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy everything else (respects .dockerignore)
COPY . .

# Compile TypeScript
RUN npm run build

# Copy SQL schema into dist
RUN cp src/database/schema.sql dist/database/schema.sql

# Remove devDependencies
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/server.js"]
