#!/bin/bash

MAX_TRIES=30
RETRY_INTERVAL=3
count=0

# Authentication credentials
NATS_USER="nats"
NATS_PASSWORD="nats"

echo "Waiting for NATS to become available..."

while [ $count -lt $MAX_TRIES ]; do
    echo "Attempting to connect to NATS, host '${CENTRAL_NATS__HOST}' on monitor port '${CENTRAL_NATS__MONITOR_PORT}'..."

    # First check basic NATS connectivity via the monitoring endpoint with authentication
    if curl -s -u "${NATS_USER}:${NATS_PASSWORD}" http://${CENTRAL_NATS__HOST}:${CENTRAL_NATS__MONITOR_PORT}/healthz > /dev/null; then
        echo "NATS server is responding to health checks"
        
        # Now check if JetStream is enabled by querying the JetStream API endpoint
        if curl -s -u "${NATS_USER}:${NATS_PASSWORD}" http://${CENTRAL_NATS__HOST}:${CENTRAL_NATS__MONITOR_PORT}/jsz > /dev/null; then
            echo "JetStream is enabled and available!"
            exit 0
        else
            echo "NATS is available but JetStream doesn't appear to be enabled yet"
        fi
    fi

    echo "Attempt $((count + 1))/$MAX_TRIES failed. Retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
    count=$((count + 1))
done

echo "Failed to connect to NATS or verify JetStream after $MAX_TRIES attempts."
exit 1
