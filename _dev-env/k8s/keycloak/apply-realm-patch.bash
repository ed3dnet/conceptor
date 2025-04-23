#! /usr/bin/env bash

# change to script directory
cd "$(dirname "$0")" || exit 1

pnpm run -s run:dev \
    node ./scripts/apply-json-patch-with-env.mjs \
    ./k8s/keycloak/config/ed3dnet.base.json \
    ./k8s/keycloak/config/ed3dnet.patch.json > ./config/ed3dnet.json