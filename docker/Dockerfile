# Multi-stage Dockerfile for Energy Control UI
# Stage 1: Build the React app with Node
# Stage 2: Serve with nginx

# ===========================================================================
# Build Stage
# ===========================================================================
# Build stage runs on the host's native platform (x86_64 on GitHub Actions)
# so Node/npm never runs under QEMU emulation.
FROM --platform=$BUILDPLATFORM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===========================================================================
# Runtime Stage
# ===========================================================================
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx template and entrypoint
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
