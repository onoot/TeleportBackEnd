# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files and tsconfig
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript and show directory contents
RUN npm run build && \
    echo "Contents of /app:" && \
    ls -la /app && \
    echo "Contents of /app/dist:" && \
    ls -la /app/dist && \
    echo "Contents of /app/dist/services:" && \
    ls -la /app/dist/services || true

# Production stage
FROM node:18-alpine

WORKDIR /app

# Create directories for secrets
RUN mkdir -p /etc/secrets/postgres \
    /etc/secrets/jwt \
    /etc/secrets/redis \
    /etc/secrets/kafka \
    /etc/secrets/mongodb \
    && chown -R node:node /etc/secrets

# Create working directory and set permissions
RUN mkdir -p /app && chown -R node:node /app

# Copy package files and tsconfig
COPY --chown=node:node package*.json tsconfig.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy compiled files from builder
COPY --chown=node:node --from=builder /app/dist ./dist

# Switch to node user
USER node

# Set startup command
CMD ["node", "dist/index.js"]

# Define ports
EXPOSE 3003 8083

# Set default environment variables
ENV NODE_ENV=production \
    PORT=3003 \
    WS_PORT=8083

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost:3003/health || exit 1 