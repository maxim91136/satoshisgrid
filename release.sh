#!/bin/bash
#
# SATOSHI'S GRID - Release Script
# Creates a proper GitHub release with all necessary steps
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

# Ask for new version
read -p "Enter new version (without 'v' prefix): " NEW_VERSION

if [ -z "$NEW_VERSION" ]; then
    echo -e "${RED}Error: Version cannot be empty${NC}"
    exit 1
fi

# Confirm
echo ""
echo -e "${CYAN}Release Checklist:${NC}"
echo "  1. Update VERSION file to ${NEW_VERSION}"
echo "  2. Verify CHANGELOG.md is up to date"
echo "  3. Verify README.md is up to date"
echo "  4. Commit all changes"
echo "  5. Push to GitHub"
echo "  6. Create GitHub Release v${NEW_VERSION} (--latest)"
echo ""
read -p "Continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "Aborted."
    exit 0
fi

# Step 1: Update VERSION
echo ""
echo -e "${GREEN}[1/6]${NC} Updating VERSION file..."
echo "$NEW_VERSION" > VERSION
echo "  VERSION set to ${NEW_VERSION}"

# Step 2: Check CHANGELOG
echo ""
echo -e "${GREEN}[2/6]${NC} Checking CHANGELOG.md..."
if grep -q "\[${NEW_VERSION}\]" CHANGELOG.md; then
    echo "  CHANGELOG.md contains entry for v${NEW_VERSION}"
else
    echo -e "${YELLOW}  Warning: CHANGELOG.md doesn't have entry for v${NEW_VERSION}${NC}"
    read -p "  Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "Aborted. Please update CHANGELOG.md first."
        exit 1
    fi
fi

# Step 3: Check README
echo ""
echo -e "${GREEN}[3/6]${NC} Checking README.md..."
if [ -f "README.md" ] && [ -s "README.md" ]; then
    echo "  README.md exists and is not empty"
else
    echo -e "${RED}  Error: README.md is missing or empty${NC}"
    exit 1
fi

# Step 4: Git status & commit
echo ""
echo -e "${GREEN}[4/6]${NC} Checking git status..."
git status --short

if [ -n "$(git status --porcelain)" ]; then
    echo ""
    read -p "Commit all changes? (y/n): " DO_COMMIT
    if [ "$DO_COMMIT" = "y" ]; then
        git add -A
        git commit -m "Release v${NEW_VERSION}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
        echo "  Changes committed"
    fi
else
    echo "  Working directory clean"
fi

# Step 5: Push to GitHub
echo ""
echo -e "${GREEN}[5/6]${NC} Pushing to GitHub..."
git push origin main
echo "  Pushed to origin/main"

# Step 6: Create GitHub Release
echo ""
echo -e "${GREEN}[6/6]${NC} Creating GitHub Release..."

# Check if release already exists
if gh release view "v${NEW_VERSION}" &>/dev/null; then
    echo -e "${YELLOW}  Release v${NEW_VERSION} already exists${NC}"
    read -p "  Delete and recreate? (y/n): " RECREATE
    if [ "$RECREATE" = "y" ]; then
        gh release delete "v${NEW_VERSION}" --yes
        echo "  Deleted existing release"
    else
        echo "Aborted."
        exit 1
    fi
fi

# Create release
gh release create "v${NEW_VERSION}" \
    --title "v${NEW_VERSION}" \
    --notes-file CHANGELOG.md \
    --latest

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  Release v${NEW_VERSION} created successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Release URL:"
gh release view "v${NEW_VERSION}" --json url --jq '.url'
