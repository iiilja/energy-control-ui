# Multi-stage Dockerfile for Energy Control UI
# Stage 1: build the React app with Node
# Stage 2: serve the static files with nginx (Node is not in the final image)

# ===========================================================================
# Build Stage
# ===========================================================================
# Runs on the host's native platform (x86_64 on GitHub Actions)
# so Node/npm never runs under QEMU emulation.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===========================================================================
# Runtime Stage
# ===========================================================================
# alpine-slim: nginx without the extra modules (njs, image-filter, xslt, geoip) we do not use.
# Pinned to the stable minor version so the base layers only change with nginx patch
# releases and Alpine security rebuilds, not with every new nginx version; unchanged
# layers are not downloaded again on the box. Bump the version now and then.
FROM nginx:1.30-alpine-slim

COPY --from=build /app/dist /usr/share/nginx/html

# The image's own entrypoint renders /etc/nginx/templates/*.template into /etc/nginx/conf.d/
# with envsubst at start-up. The filter limits it to API_HOST, so nginx variables
# such as $uri or $host are left alone.
ENV NGINX_ENVSUBST_FILTER=^API_HOST$
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
