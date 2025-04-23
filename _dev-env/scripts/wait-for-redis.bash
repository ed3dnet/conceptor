#!/bin/bash

MAX_TRIES=30
RETRY_INTERVAL=3
count=0

echo "Waiting for Redis to become available..."

while [ $count -lt $MAX_TRIES ]; do
    # Extract host and port from Redis URL
    REDIS_HOST=$(echo "$REDIS__URL" | sed -n 's/.*redis:\/\/\([^:]*\):.*/\1/p')
    REDIS_PORT=$(echo "$REDIS__URL" | sed -n 's/.*:\([0-9]*\)$/\1/p')

    # Use redis-cli ping to check connectivity
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping

    # shellcheck disable=SC2181
    if [ $? -eq 0 ]; then
        echo "Successfully connected to Redis!"
        exit 0
    fi

    echo "Attempt $((count + 1))/$MAX_TRIES failed. Retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
    count=$((count + 1))
done

echo "Failed to connect to Redis after $MAX_TRIES attempts."
exit 1