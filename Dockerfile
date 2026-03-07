FROM node:20-alpine

WORKDIR /app

# Install dependencies (includes devDependencies for TypeScript build)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY . .
RUN npm run build

# Prune devDependencies for production image
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/server.js"]
