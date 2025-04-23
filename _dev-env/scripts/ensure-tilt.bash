#! /bin/bash

# Sometimes we have some transforms we need to make to set up the dev
# environment before we start Tilt. This includes creating the keycloak
# realm file from its base file and its patch, which is doctored to
# include env vars before it's written out.

set -euo pipefail

# cd to script directory
cd "$(dirname "$0")" || exit 1

# cd to parent directory
cd .. || exit 1

# ensure keycloak's realm is ready
./k8s/keycloak/apply-realm-patch.bash