# SebairGit

> Upload any ZIP file directly to a GitHub repository in seconds.

![PWA](https://img.shields.io/badge/PWA-enabled-2EA043?style=flat-square)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square)
![Region](https://img.shields.io/badge/Region-EU%20Paris-blue?style=flat-square)

## What it does

1. **Drop a ZIP** — drag & drop or browse
2. **Extracts** — server-side, preserving exact folder structure
3. **Pushes** — all files to a new GitHub repository via Tree API
4. **Verifies** — file count confirmed after upload

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 |
| Styles | Inline CSS (zero deps) |
| PWA | vite-plugin-pwa + Workbox |
| Backend | Vercel Serverless Function |
| GitHub | @octokit/rest + Tree API |
| Region | EU Paris (`cdg1`) |

## Deploy

```bash
# 1. Clone
git clone https://github.com/Sebair50s/sebairgit-app.git
cd sebairgit-app

# 2. Install
npm install

# 3. Set env var in Vercel dashboard:
#    GITHUB_TOKEN = your_github_token

# 4. Deploy
vercel deploy --prod --regions cdg1
```

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `GITHUB_TOKEN` | Vercel (server-side only) | GitHub PAT with `repo` + `user` scope |

> ⚠️ The token is **never** exposed to the frontend or included in the build.

## API

### `POST /api/upload`

| Field | Type | Description |
|-------|------|-------------|
| `zip` | File | ZIP archive (max 50 MB) |

**Response:**
```json
{
  "success": true,
  "repoUrl": "https://github.com/user/repo-abc123",
  "repoName": "my-project-abc123",
  "fileCount": 47,
  "expectedCount": 47,
  "verified": true,
  "commitSha": "a3f8c9d",
  "totalSizeKb": 2400
}
```

## Security

- Token stored server-side only (Vercel env vars)
- ZIP validated by magic bytes (not just extension)
- Path traversal protection
- 50 MB file size limit
- Rate limiting (10 req/min per IP)

## License

MIT
