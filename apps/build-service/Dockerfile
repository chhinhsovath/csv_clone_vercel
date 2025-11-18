FROM node:20

WORKDIR /app

# Install Git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY apps/build-service/package.json ./
RUN npm install

# Copy source code
COPY apps/build-service ./

# Expose Docker socket for building containers
VOLUME ["/var/run/docker.sock"]

CMD ["npm", "start"]
