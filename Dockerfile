# CyberShieldX Webplatform Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create necessary directories for downloads
RUN mkdir -p public/downloads

# Build the application for production
RUN npm run build

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Open port
EXPOSE 5000

# Run the app
CMD ["npm", "run", "start"]