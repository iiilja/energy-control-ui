#!/bin/bash
# Update energy-control-ui on the H96 box. Usage: ./update-energy-ui.sh
# Pulls the latest image (with timeout and retries), recreates the container, checks that
# the page and the API proxy answer, and logs every step to ~/update-energy-ui.log.
set -euo pipefail

IMAGE="ghcr.io/iiilja/energy-control-ui:latest"
NAME="energy-control-ui"
API_HOST="172.17.0.1:8080"   # energy-control-api as seen from inside the container (docker0 gateway)
HOST_PORT=3000
LOG="$HOME/update-energy-ui.log"
PULL_TIMEOUT=300     # seconds per pull attempt
PULL_ATTEMPTS=3
READY_TIMEOUT=60     # seconds to wait for nginx to answer

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG"; }
trap 'log "FAILED at line $LINENO"' ERR

# HTTP status of a URL on this box, 000 if nothing answers
http_status() {
  if command -v curl >/dev/null; then
    # curl prints 000 itself when nothing answers
    curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1" || true
  else
    { wget -q -S -O /dev/null -T 5 -t 1 "$1" 2>&1 || true; } | awk '/^ *HTTP\//{c=$2} END{print c ? c : "000"}'
  fi
}

log "=== Update started"
log "Disk free: $(df -h /var/lib/docker | awk 'NR==2 {print $4 " of " $2}')"

OLD_ID=$(docker image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null || echo none)
log "Image before pull: ${OLD_ID:7:12}"

# --- pull with timeout and retries ---
for i in $(seq 1 "$PULL_ATTEMPTS"); do
  log "Pulling $IMAGE (attempt $i/$PULL_ATTEMPTS, timeout ${PULL_TIMEOUT}s)"
  if timeout "$PULL_TIMEOUT" docker pull "$IMAGE" 2>&1 | tee -a "$LOG"; then
    log "Pull finished"
    break
  fi
  log "Pull failed or timed out"
  if [ "$i" -eq "$PULL_ATTEMPTS" ]; then
    log "Giving up, container left as it was"
    exit 1
  fi
  sleep 10
done

NEW_ID=$(docker image inspect --format '{{.Id}}' "$IMAGE")
RUNNING_ID=$(docker inspect --format '{{.Image}}' "$NAME" 2>/dev/null || echo none)
if [ "$NEW_ID" = "$RUNNING_ID" ]; then
  log "Container already runs the latest image (${NEW_ID:7:12}), nothing to do"
  exit 0
fi
log "New image: ${NEW_ID:7:12}"

# --- recreate container (docker restart would keep the old image) ---
log "Removing old container"
docker rm -f "$NAME" >/dev/null 2>&1 || true

log "Starting new container"
docker run -d \
  --name "$NAME" \
  -e API_HOST="$API_HOST" \
  -p "$HOST_PORT":80 \
  --restart unless-stopped \
  "$IMAGE" | tee -a "$LOG"

# --- wait until nginx serves the page ---
log "Waiting for http://localhost:$HOST_PORT/ (up to ${READY_TIMEOUT}s)"
STATUS=000
for _ in $(seq 1 $((READY_TIMEOUT / 2))); do
  STATUS=$(http_status "http://localhost:$HOST_PORT/")
  [ "$STATUS" = "200" ] && break
  if [ "$(docker inspect --format '{{.State.Running}}' "$NAME" 2>/dev/null)" != "true" ]; then
    log "Container stopped, last log lines:"
    docker logs --tail 50 "$NAME" 2>&1 | tee -a "$LOG"
    exit 1
  fi
  sleep 2
done
if [ "$STATUS" != "200" ]; then
  log "UI answers $STATUS instead of 200, last log lines:"
  docker logs --tail 50 "$NAME" 2>&1 | tee -a "$LOG"
  exit 1
fi
log "UI is up"

# --- check the proxy to the API (not fatal: the UI itself works, the API may be updating) ---
# Without credentials the API answers 401; 502/504 means nginx cannot reach API_HOST.
API_STATUS=$(http_status "http://localhost:$HOST_PORT/api/v1/auth/test")
case "$API_STATUS" in
  401|200) log "API proxy OK (HTTP $API_STATUS)" ;;
  *)       log "WARNING: API proxy answers HTTP $API_STATUS. Is energy-control-api running on $API_HOST?" ;;
esac

log "Removing unused images"
docker image prune -f | tee -a "$LOG"
log "=== Update done"
