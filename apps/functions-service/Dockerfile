FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/functions-service/package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY apps/functions-service/src ./src
COPY apps/functions-service/tsconfig.json ./

# Expose port
EXPOSE 9001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 0

# Start the server in development mode with tsx
CMD ["npm", "run", "dev"]
