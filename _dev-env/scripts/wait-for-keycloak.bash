#!/bin/bash

MAX_TRIES=30
RETRY_INTERVAL=5
count=0

# making sure `curl` is available
command -v curl >/dev/null 2>&1 || { echo >&2 "curl is required but it's not installed. Aborting."; exit 1; }

echo "Waiting for Keycloak to become available..."

while [ $count -lt $MAX_TRIES ]; do
    echo "Attempting to connect to Keycloak at '$KEYCLOAK_URL'..."

    # Try to access Keycloak's health endpoint
    curl -s -o /dev/null -w "%{http_code}" "$KEYCLOAK_URL/realms/master" | grep -q "200"

    if [ $? -eq 0 ]; then
        echo "Successfully connected to Keycloak!"
        exit 0
    fi

    echo "Attempt $((count + 1))/$MAX_TRIES failed. Retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
    count=$((count + 1))
done

echo "Failed to connect to Keycloak after $MAX_TRIES attempts."
exit 1