/**
 * POST /api/upload
 * Accepts ZIP file, extracts it, pushes all files to a new GitHub repo.
 * Auth: Authorization: Bearer <JWT>  — NO cookies whatsoever.
 */
'use strict';

const path             = require('path');
const fs               = require('fs');
const crypto           = require('crypto');
const { Octokit }      = require('@octokit/rest');
const AdmZip           = require('adm-zip');
const formidable       = require('formidable');
const { verifyToken }  = require('./_jwt');

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE  = 50 * 1024 * 1024;   // 50 MB
const BATCH_SIZE     = 8;
const RATE_LIMIT     = 10;
const RATE_WINDOW_MS = 60_000;

const SKIP = ['__MACOSX', '.DS_Store', 'Thumbs.db', 'desktop.ini', '.git/', '.git\\'];

// ── Rate limiter (in-memory per cold start) ───────────────────────────────────
const _rl = new Map();
function rateLimit(ip) {
  const now = Date.now();
  let e = _rl.get(ip);
  if (!e || now > e.reset) e = { count: 0, reset: now + RATE_WINDOW_MS };
  e.count++;
  _rl.set(ip, e);
  return e.count <= RATE_LIMIT;
}

// ── ZIP extraction ────────────────────────────────────────────────────────────
function extractZip(zipPath) {
  let zip;
  try { zip = new AdmZip(zipPath); }
  catch { throw new Error('Invalid or corrupted ZIP file.'); }

  const files = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const raw  = entry.entryName.replace(/\\/g, '/');
    const norm = path.posix.normalize(raw);
    if (norm.startsWith('../') || norm.includes('/../')) continue;   // path traversal
    if (SKIP.some(p => raw.includes(p))) continue;
    let content;
    try { content = entry.getData(); } catch { continue; }
    if (!content?.length) continue;
    files.push({ path: norm, content, size: content.length });
  }
  return files;
}

function stripRoot(files) {
  if (!files.length) return files;
  const roots = [...new Set(files.map(f => f.path.split('/')[0]))];
  if (roots.length !== 1) return files;
  const prefix   = roots[0] + '/';
  const stripped = files
    .map(f => ({ ...f, path: f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path }))
    .filter(f => f.path.length > 0);
  return stripped.length === files.length ? stripped : files;
}

// ── GitHub batch blob upload ──────────────────────────────────────────────────
async function createBlobs(octokit, owner, repo, files) {
  const results = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const settled = await Promise.allSettled(
      files.slice(i, i + BATCH_SIZE).map(async f => {
        const { data } = await octokit.git.createBlob({
          owner, repo,
          content:  f.content.toString('base64'),
          encoding: 'base64',
        });
        return { path: f.path, sha: data.sha };
      })
    );
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value);
      else console.error('[upload] Blob error:', r.reason?.message);
    }
  }
  return results;
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // ── 1. Auth: validate JWT from Authorization header ───────────────────────
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const GH_TOKEN = decoded.ghToken;
  if (!GH_TOKEN) {
    return res.status(401).json({ error: 'Token missing GitHub credentials — please login again.' });
  }

  // ── 2. Rate limit ─────────────────────────────────────────────────────────
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests. Wait a minute.' });

  let tmpPath = null;

  try {
    // ── 3. Parse multipart form ───────────────────────────────────────────
    const form = formidable({
      maxFileSize:    MAX_FILE_SIZE,
      uploadDir:      '/tmp',
      keepExtensions: true,
      filename:       () => `sg-${crypto.randomBytes(8).toString('hex')}.zip`,
    });

    const [, files] = await new Promise((resolve, reject) =>
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve([fields, files]))
    );

    const uploaded = (files.zip || files.file || [])[0];
    if (!uploaded) return res.status(400).json({ error: 'No file received. Use field name "zip".' });

    tmpPath = uploaded.filepath;
    const originalName = uploaded.originalFilename || 'upload.zip';

    // ── 4. Validate ZIP magic bytes ───────────────────────────────────────
    const magic = Buffer.alloc(4);
    const fd    = fs.openSync(tmpPath, 'r');
    fs.readSync(fd, magic, 0, 4, 0);
    fs.closeSync(fd);
    if (magic[0] !== 0x50 || magic[1] !== 0x4b) {
      return res.status(400).json({ error: 'File is not a valid ZIP archive.' });
    }

    // ── 5. Extract ────────────────────────────────────────────────────────
    const extractedFiles = stripRoot(extractZip(tmpPath));
    if (!extractedFiles.length) return res.status(400).json({ error: 'ZIP is empty or contains no readable files.' });

    const totalBytes = extractedFiles.reduce((s, f) => s + f.size, 0);

    // ── 6. GitHub: create repo ────────────────────────────────────────────
    const octokit = new Octokit({ auth: GH_TOKEN });
    const { data: ghUser } = await octokit.users.getAuthenticated();
    const owner = ghUser.login;

    const base = originalName
      .replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-{2,}/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
    const repoName = `${base || 'upload'}-${crypto.randomBytes(3).toString('hex')}`;

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name:        repoName,
      description: `Uploaded via SebairGit · ${new Date().toISOString().split('T')[0]} · ${extractedFiles.length} files`,
      private:     false,
      auto_init:   true,
    });

    await new Promise(r => setTimeout(r, 2000)); // GitHub needs a moment after auto_init

    // ── 7. Tree API: batch upload ─────────────────────────────────────────
    const { data: ref }     = await octokit.git.getRef({ owner, repo: repoName, ref: `heads/${repo.default_branch}` });
    const { data: commit }  = await octokit.git.getCommit({ owner, repo: repoName, commit_sha: ref.object.sha });

    const blobs = await createBlobs(octokit, owner, repoName, extractedFiles);
    if (!blobs.length) throw new Error('Failed to create any file blobs on GitHub.');

    const { data: tree }      = await octokit.git.createTree({ owner, repo: repoName, base_tree: commit.tree.sha, tree: blobs.map(({ path: p, sha }) => ({ path: p, mode: '100644', type: 'blob', sha })) });
    const { data: newCommit } = await octokit.git.createCommit({ owner, repo: repoName, message: `chore: upload ${blobs.length} files via SebairGit`, tree: tree.sha, parents: [ref.object.sha] });
    await octokit.git.updateRef({ owner, repo: repoName, ref: `heads/${repo.default_branch}`, sha: newCommit.sha });

    // ── 8. Verify ─────────────────────────────────────────────────────────
    const { data: verifyTree } = await octokit.git.getTree({ owner, repo: repoName, tree_sha: newCommit.sha, recursive: '1' });
    const uploadedCount = verifyTree.tree.filter(i => i.type === 'blob' && i.path !== 'README.md').length;

    return res.status(200).json({
      success:       true,
      repoUrl:       repo.html_url,
      repoName,
      owner,
      branch:        repo.default_branch,
      fileCount:     uploadedCount,
      expectedCount: extractedFiles.length,
      verified:      uploadedCount >= extractedFiles.length,
      commitSha:     newCommit.sha.slice(0, 7),
      totalSizeKb:   Math.round(totalBytes / 1024),
    });

  } catch (err) {
    console.error('[upload] Error:', err.message);
    if (err.status === 401) return res.status(401).json({ error: 'GitHub token expired — please login again.' });
    if (err.status === 403) return res.status(403).json({ error: 'GitHub permission denied.' });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Max 50 MB.' });
    return res.status(500).json({ error: err.message || 'Upload failed.' });

  } finally {
    if (tmpPath) try { fs.unlinkSync(tmpPath); } catch {}
  }
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  'https://sebairgit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}
