#!/bin/bash

SCRIPT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SQL_FILE="reset-postgres.sql"

# Connect to the database and drop all objects
psql "${CENTRAL_POSTGRES__READWRITE__URL}" -f "${SCRIPT_ROOT}/${SQL_FILE}"