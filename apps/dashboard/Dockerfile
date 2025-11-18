FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json next.config.js ./

# Install dependencies
RUN npm install

# Copy source code
COPY app ./app
COPY lib ./lib
COPY public ./public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 0

# Start in development mode
CMD ["npm", "run", "dev"]
