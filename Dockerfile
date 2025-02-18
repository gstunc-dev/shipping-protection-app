# Use Node.js 20 (or latest stable version)
FROM node:20-alpine

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
RUN npm ci --omit=dev && npm cache clean --force

# Remove Shopify CLI (optional, only if you don't need it in the container)
RUN npm remove @shopify/cli || true

# Copy application source code
COPY . .

# Build the Remix app
RUN npm run build

# Start the app
CMD ["npm", "run", "docker-start"]
