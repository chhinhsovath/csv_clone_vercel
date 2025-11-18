FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/dashboard/package.json ./
COPY apps/dashboard/tsconfig.json ./
COPY apps/dashboard/next.config.js ./
COPY apps/dashboard/.eslintrc.json ./
COPY apps/dashboard/app ./app
COPY apps/dashboard/lib ./lib
COPY apps/dashboard/public ./public

# Install dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 0

# Start in development mode with tsx
CMD ["npm", "run", "dev"]
