#!/bin/bash

MAX_TRIES=30
RETRY_INTERVAL=3
count=0

echo "Waiting for NATS to become available..."

while [ $count -lt $MAX_TRIES ]; do
    echo "Attempting to connect to NATS, host '${CENTRAL_NATS__HOST}' on monitor port '${CENTRAL_NATS__MONITOR_PORT}'..."

    # Try to connect to NATS using the nats CLI tool
    # If you don't have the nats CLI tool, you can use curl to check the monitoring endpoint
    curl -s http://${CENTRAL_NATS__HOST}:${CENTRAL_NATS__MONITOR_PORT}/healthz > /dev/null

    # shellcheck disable=SC2181
    if [ $? -eq 0 ]; then
        echo "Successfully connected to NATS!"
        exit 0
    fi

    echo "Attempt $((count + 1))/$MAX_TRIES failed. Retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
    count=$((count + 1))
done

echo "Failed to connect to NATS after $MAX_TRIES attempts."
exit 1
