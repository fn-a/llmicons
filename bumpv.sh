#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 [package] [bump]"
  echo "  package: root | lobe | mdev  (default: auto-detect from git tag)"
  echo "  bump:    patch | minor       (optional)"
  exit 1
}

PACKAGE="${1:-}"
BUMP="${2:-}"

if [[ -z "$PACKAGE" ]]; then
  TAG="$(git describe --tags --exact-match 2>/dev/null || true)"
  if [[ -z "$TAG" ]]; then
    echo "Error: no tag found and no package specified"
    usage
  fi
  case "$TAG" in
    lobe-v*) PACKAGE="lobe" ;;
    mdev-v*) PACKAGE="mdev" ;;
    v*)      PACKAGE="root" ;;
    *)       echo "Unknown tag: $TAG"; exit 1 ;;
  esac
fi

case "$PACKAGE" in
  root|lobe|mdev) ;;
  *) echo "Invalid package: $PACKAGE"; usage ;;
esac

if [[ -n "$BUMP" ]]; then
  case "$BUMP" in
    patch|minor) ;;
    *) echo "Invalid bump level: $BUMP"; usage ;;
  esac
fi

echo "Package: $PACKAGE"
echo "Bump:    ${BUMP:-none}"

if [[ "$PACKAGE" == "root" ]]; then
  if [[ -n "$BUMP" ]]; then
    npm version "$BUMP" --no-git-tag-version
  fi
elif [[ "$PACKAGE" == "lobe" ]]; then
  pnpm tsx build.ts lobe
  if [[ -n "$BUMP" ]]; then
    cd icons/lobe && npm version "$BUMP" --no-git-tag-version && cd ../..
  fi
elif [[ "$PACKAGE" == "mdev" ]]; then
  pnpm tsx build.ts mdev
  if [[ -n "$BUMP" ]]; then
    cd icons/mdev && npm version "$BUMP" --no-git-tag-version && cd ../..
  fi
fi

if [[ "$PACKAGE" == "root" ]]; then
  PKG_NAME="$(node -p "require('./package.json').name")"
  VERSION="$(node -p "require('./package.json').version")"
  git add package.json
elif [[ "$PACKAGE" == "lobe" ]]; then
  PKG_NAME="$(node -p "require('./icons/lobe/package.json').name")"
  VERSION="$(node -p "require('./icons/lobe/package.json').version")"
  git add icons/lobe/*
elif [[ "$PACKAGE" == "mdev" ]]; then
  PKG_NAME="$(node -p "require('./icons/mdev/package.json').name")"
  VERSION="$(node -p "require('./icons/mdev/package.json').version")"
  git add icons/mdev/*
fi

if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "chore(release): ${PKG_NAME}@v${VERSION} [skip ci]"
  git push
fi

if [[ "$PACKAGE" == "lobe" ]]; then
  cd icons/lobe && npm publish --access public && cd ../..
elif [[ "$PACKAGE" == "mdev" ]]; then
  cd icons/mdev && npm publish --access public && cd ../..
elif [[ "$PACKAGE" == "root" ]]; then
  npm publish --access public
fi

if [[ "$PACKAGE" == "root" ]]; then
  TAG="v$(node -p "require('./package.json').version")"
elif [[ "$PACKAGE" == "lobe" ]]; then
  TAG="lobe-v$(node -p "require('./icons/lobe/package.json').version")"
elif [[ "$PACKAGE" == "mdev" ]]; then
  TAG="mdev-v$(node -p "require('./icons/mdev/package.json').version")"
fi

git tag "$TAG"
git push origin "$TAG"