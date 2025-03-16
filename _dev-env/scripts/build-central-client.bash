#! /bin/bash

set -e

SCRIPT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="${SCRIPT_ROOT}/../.."

cd "$REPO_ROOT" || exit 1

pushd ./apps/central || exit 1

TMPFILE="$(mktemp)"

# TODO: this hack sucks - we have something spitting log entries into stdout
pnpm run --silent cli:dev utils print-openapi | grep -v "openapi-print/" | grep -v '    component: "' > "$TMPFILE"

popd || exit 1

pushd ./packages/central-client || exit 1

rm -rf ./src/generated/*.ts || true
pnpm openapi-box "$TMPFILE" -o "./src/generated/schemas.ts"
pnpm openapi-typescript "$TMPFILE" -o "./src/generated/paths.ts"
pnpm generate-types

popd || exit 1