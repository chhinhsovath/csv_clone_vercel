FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/reverse-proxy/package.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY apps/reverse-proxy/src ./src
COPY apps/reverse-proxy/tsconfig.json ./

# Build TypeScript
RUN npm run build

# Create certs directory
RUN mkdir -p /app/certs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the server
CMD ["npm", "start"]
