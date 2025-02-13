#!/bin/bash

# Find PIDs of processes with '44021' in their arguments
pids=$(ps aux | grep '44021' | grep -v grep | awk '{print $2}')

if [ -z "$pids" ]; then
    echo "No processes found with '44021' in arguments"
    exit 0
fi

echo "Found processes to kill:"
for pid in $pids; do
    echo "PID: $pid - $(ps -p $pid -o command=)"
done

echo -n "Proceed with killing these processes? (y/N): "
read response

if [[ "$response" =~ ^[Yy]$ ]]; then
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
else
    echo "Operation cancelled"
fi