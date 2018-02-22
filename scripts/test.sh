#!/usr/bin/env bash
set -e

yarn run test:compile
yarn run test:style
yarn run test:unit
