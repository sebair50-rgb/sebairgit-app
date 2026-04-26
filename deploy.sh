#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  SebairGit — One-Command Deploy to Vercel (EU Region)
#  Run:  bash deploy.sh
# ═══════════════════════════════════════════════════════════
set -e

# ── CONFIGURE THESE ──────────────────────────────────────────
GITHUB_TOKEN="${GITHUB_TOKEN:-YOUR_GITHUB_TOKEN_HERE}"
# ─────────────────────────────────────────────────────────────

echo ""
echo "  ███████╗███████╗██████╗  █████╗ ██╗██████╗  ██████╗ ██╗████████╗"
echo "  ██╔════╝██╔════╝██╔══██╗██╔══██╗██║██╔══██╗██╔════╝ ██║╚══██╔══╝"
echo "  ███████╗█████╗  ██████╔╝███████║██║██████╔╝██║  ███╗██║   ██║   "
echo "  ╚════██║██╔══╝  ██╔══██╗██╔══██║██║██╔══██╗██║   ██║██║   ██║   "
echo "  ███████║███████╗██████╔╝██║  ██║██║██║  ██║╚██████╔╝██║   ██║   "
echo "  ╚══════╝╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝   ╚═╝  "
echo ""
echo "  ZIP → GitHub in Seconds"
echo ""

# ── 1. Prerequisites ──────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "✗ Node.js not found. Install from https://nodejs.org"; exit 1
fi
if ! command -v npm &>/dev/null; then
  echo "✗ npm not found. Install Node.js"; exit 1
fi

# ── 2. Install Vercel CLI if needed ──────────────────────────
if ! command -v vercel &>/dev/null; then
  echo "→ Installing Vercel CLI…"
  npm install -g vercel@latest
fi
echo "✓ Vercel CLI $(vercel --version 2>&1 | head -1)"

# ── 3. Install dependencies ───────────────────────────────────
echo ""
echo "→ Installing dependencies…"
npm install

# ── 4. Build PWA ─────────────────────────────────────────────
echo ""
echo "→ Building PWA…"
npm run build
echo "✓ Build complete"

# ── 5. Set GITHUB_TOKEN in Vercel env vars ────────────────────
echo ""
echo "→ Configuring Vercel environment variables…"

# Add GITHUB_TOKEN to all three environments (production, preview, development)
echo "$GITHUB_TOKEN" | vercel env add GITHUB_TOKEN production  --yes 2>/dev/null || true
echo "$GITHUB_TOKEN" | vercel env add GITHUB_TOKEN preview     --yes 2>/dev/null || true

echo "✓ GITHUB_TOKEN set in Vercel (server-side only, never exposed to client)"

# ── 6. Deploy to Vercel EU (cdg1 = Paris) ─────────────────────
echo ""
echo "→ Deploying to Vercel EU (Paris / cdg1)…"
DEPLOY_URL=$(vercel deploy --prod --regions cdg1 --yes 2>&1 | grep -E "https://.*\.vercel\.app" | tail -1)

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✓ SebairGit deployed successfully!"
echo ""
echo "  🌐 URL: $DEPLOY_URL"
echo ""
echo "  The GITHUB_TOKEN is stored securely in"
echo "  Vercel's environment — never in the frontend."
echo "═══════════════════════════════════════════════"
echo ""
