#!/usr/bin/env bash
set -e

source ./scripts/include/node.sh

PACKAGE_XY=$(node -e "console.log(JSON.parse(fs.readFileSync('package.json')).version.replace(/\.\d+$/, ''))")
PACKAGE_VERSION="${PACKAGE_XY}.${CIRCLE_BUILD_NUM}"

yarn compile

echo "Releasing ${PACKAGE_VERSION}"
write_package_key version "${PACKAGE_VERSION}"
git add package.json
git commit -m "v${PACKAGE_VERSION}"
git tag v${PACKAGE_VERSION}

git push --tags
yarn publish --new-version $PACKAGE_VERSION
