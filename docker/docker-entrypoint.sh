#!/bin/sh
set -e

# Substitute only ${API_HOST} - leaves nginx variables like $uri, $host untouched
envsubst '${API_HOST}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
