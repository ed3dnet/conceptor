#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="${SCRIPT_DIR}/config.yaml"
CREDS_PATH="${SCRIPT_DIR}/tunnel-credentials.json"

# Check for required files
if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Error: config.yaml not found. Run init-cloudflare-tunnel.ts first."
  exit 1
fi

if [[ ! -f "$CREDS_PATH" ]]; then
  echo "Error: tunnel-credentials.json not found. Run init-cloudflare-tunnel.ts first."
  exit 1
fi

# Extract tunnel name from config
TUNNEL_NAME=$(yq '.tunnel' "$CONFIG_PATH")

# Run the tunnel
exec cloudflared tunnel --config "$CONFIG_PATH" run "$TUNNEL_NAME"
