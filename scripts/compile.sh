#!/usr/bin/env bash
set -e

source ./scripts/include/node.sh

yarn run clean
tsc "${@}"
