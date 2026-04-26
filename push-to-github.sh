#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
#  SebairGit — Create GitHub repo + push in one command
#  Run this on YOUR machine (not in Claude's container)
#
#  Usage:  bash push-to-github.sh
# ══════════════════════════════════════════════════════════

GITHUB_TOKEN="${GITHUB_TOKEN:-YOUR_GITHUB_TOKEN_HERE}"
REPO_NAME="sebairgit-app"

echo "→ Creating GitHub repository '$REPO_NAME'..."

# Create the repo via GitHub API
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d "{
    \"name\": \"$REPO_NAME\",
    \"description\": \"SebairGit — Upload any ZIP to GitHub in seconds. PWA built with React + Vite.\",
    \"private\": false,
    \"auto_init\": false
  }")

# Parse the repo URL
REPO_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('html_url',''))" 2>/dev/null)
OWNER=$(echo "$RESPONSE"    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('owner',{}).get('login',''))" 2>/dev/null)
MSG=$(echo "$RESPONSE"      | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null)

# Handle "already exists"
if echo "$MSG" | grep -q "already exists"; then
  echo "✓ Repository already exists — using it"
  OWNER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | python3 -c "import sys,json; print(json.load(sys.stdin)['login'])")
  REPO_URL="https://github.com/$OWNER/$REPO_NAME"
elif [ -z "$REPO_URL" ]; then
  echo "✗ Could not create repo. Response: $RESPONSE"
  exit 1
fi

echo "✓ Repository: $REPO_URL"
echo ""

# Set up remote with token auth
PUSH_URL="https://${GITHUB_TOKEN}@github.com/${OWNER}/${REPO_NAME}.git"

echo "→ Pushing all files..."
git remote remove origin 2>/dev/null || true
git remote add origin "$PUSH_URL"
git branch -M main
git push -u origin main --force

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✓ SebairGit pushed to GitHub!"
echo ""
echo "  🔗 $REPO_URL"
echo ""
echo "  Next step — Deploy to Vercel:"
echo "  1. vercel --cwd . deploy --prod --regions cdg1"
echo "  2. Set GITHUB_TOKEN in Vercel env vars"
echo "══════════════════════════════════════════════════"
