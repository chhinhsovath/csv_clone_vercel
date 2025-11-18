FROM node:20

WORKDIR /app

# Install Git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy files
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Expose Docker socket for building containers
VOLUME ["/var/run/docker.sock"]

CMD ["npm", "start"]
