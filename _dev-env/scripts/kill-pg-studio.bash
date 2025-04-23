#!/bin/bash

port="$DRIZZLE_STUDIO_PORT"

NEEDLE="port $port"

if [[ $(uname) == "Darwin" ]]; then
    pids=$(pgrep -f -- "$NEEDLE")
else
    pids=$(pgrep -fA -- "$NEEDLE")
fi

for pid in $pids; do
    echo "PID: $pid - $(ps -p $pid -o command=)"
done

for pid in $pids; do
    kill $pid
    echo "Sent SIGTERM to PID $pid"
done

# Wait a moment and check if processes need SIGKILL
sleep 2

for pid in $pids; do
    if ps -p $pid > /dev/null 2>&1; then
        echo "Process $pid still running, sending SIGKILL"
        kill -9 $pid
    fi
done