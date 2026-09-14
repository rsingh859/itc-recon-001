FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Cache dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application code
COPY . .

# Environment configuration
ENV NODE_ENV=development
ENV VITE_BACKEND_TARGET=http://gateway:8080

EXPOSE 3000

CMD ["npm", "run", "dev"]
