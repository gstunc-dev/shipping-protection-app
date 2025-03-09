# Use Node.js 20 (or latest stable version)
FROM node:20-alpine

# Install global dependencies
RUN npm install -g pnpm

# Install OpenSSL (if needed for your app)
RUN apk add --no-cache openssl

# Expose port
EXPOSE 3000

# Set working directory
WORKDIR /app

# Set environment variable
ENV NODE_ENV=production

# Copy package files first for efficient caching
COPY package.json package-lock.json* ./

# Install production dependencies
RUN pnpm install

# Remove Shopify CLI (optional, only if you don't need it in the container)
RUN pnpm remove @shopify/cli || true

# Copy Prisma folder to the app directory
COPY prisma ./prisma

# Copy application source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Remix app
RUN pnpm run build

# Start the app
CMD ["npm", "run", "docker-start"]
