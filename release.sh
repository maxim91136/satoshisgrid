#!/bin/bash
#
# SATOSHI'S GRID - Release Script
# Creates a proper GitHub release with all necessary steps
#
# Usage: ./release.sh <version>
# Example: ./release.sh 1.0.14
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔════════════════════════════════════════╗"
echo "║     SATOSHI'S GRID - Release Tool      ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Get current version
CURRENT_VERSION=$(cat VERSION 2>/dev/null || echo "0.0.0")
echo -e "Current version: ${YELLOW}v${CURRENT_VERSION}${NC}"

# Check for version argument
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version required${NC}"
    echo "Usage: ./release.sh <version>"
    echo "Example: ./release.sh 1.0.14"
    exit 1
fi

NEW_VERSION="$1"

echo -e "New version: ${GREEN}v${NEW_VERSION}${NC}"
echo ""

# Step 1: Update VERSION
echo -e "${GREEN}[1/6]${NC} Updating VERSION file..."
echo "$NEW_VERSION" > VERSION
echo "  VERSION set to ${NEW_VERSION}"

# Step 2: Check CHANGELOG
echo ""
echo -e "${GREEN}[2/6]${NC} Checking CHANGELOG.md..."
if grep -q "\[${NEW_VERSION}\]" CHANGELOG.md; then
    echo "  ✅ CHANGELOG.md contains entry for v${NEW_VERSION}"
else
    echo -e "${RED}  ❌ CHANGELOG.md missing entry for v${NEW_VERSION}${NC}"
    echo "  Please add changelog entry before releasing."
    # Revert VERSION
    echo "$CURRENT_VERSION" > VERSION
    exit 1
fi

# Step 3: Check README
echo ""
echo -e "${GREEN}[3/6]${NC} Checking README.md..."
if [ -f "README.md" ] && [ -s "README.md" ]; then
    echo "  ✅ README.md exists"
else
    echo -e "${RED}  ❌ README.md is missing or empty${NC}"
    exit 1
fi

# Step 4: Git status & commit
echo ""
echo -e "${GREEN}[4/6]${NC} Committing changes..."
git add -A

if [ -n "$(git status --porcelain)" ]; then
    git commit -m "Release v${NEW_VERSION}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
    echo "  ✅ Changes committed"
else
    echo "  ℹ️  Working directory clean, no commit needed"
fi

# Step 5: Push to GitHub
echo ""
echo -e "${GREEN}[5/6]${NC} Pushing to GitHub..."
git push origin main
echo "  ✅ Pushed to origin/main"

# Step 6: Create GitHub Release
echo ""
echo -e "${GREEN}[6/6]${NC} Creating GitHub Release..."

# Check if release already exists
if gh release view "v${NEW_VERSION}" &>/dev/null; then
    echo "  ⚠️  Release v${NEW_VERSION} already exists, deleting..."
    gh release delete "v${NEW_VERSION}" --yes
    # Also delete the tag if it exists
    git tag -d "v${NEW_VERSION}" 2>/dev/null || true
    git push origin --delete "v${NEW_VERSION}" 2>/dev/null || true
fi

# Create release with --latest flag
gh release create "v${NEW_VERSION}" \
    --title "v${NEW_VERSION}" \
    --notes-file CHANGELOG.md \
    --latest

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Release v${NEW_VERSION} created successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Release URL:"
gh release view "v${NEW_VERSION}" --json url --jq '.url'
