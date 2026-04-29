/**
 * POST /api/upload
 * JWT auth via Authorization: Bearer header — zero cookies.
 * Robust ZIP extraction + GitHub Tree API with retry logic.
 */
'use strict';

const path            = require('path');
const fs              = require('fs');
const crypto          = require('crypto');
const { Octokit }     = require('@octokit/rest');
const AdmZip          = require('adm-zip');
const formidable      = require('formidable');
const { verifyToken } = require('./_jwt');

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_ZIP_SIZE   = 50 * 1024 * 1024;   // 50 MB
const MAX_BLOB_BYTES = 99 * 1024 * 1024;   // 99 MB GitHub blob limit
const BATCH_SIZE     = 5;                   // concurrent blob creates (conservative)
const RATE_LIMIT     = 10;
const RATE_WINDOW_MS = 60_000;

// Entries to skip from ZIP
const SKIP_PATTERNS = [
  '__MACOSX', '.DS_Store', 'Thumbs.db', 'desktop.ini',
  '.git/', '.git\\', 'node_modules/',
];

// ── Rate limiter ──────────────────────────────────────────────────────────────
const _rl = new Map();
function rateLimit(ip) {
  const now = Date.now();
  let e = _rl.get(ip);
  if (!e || now > e.reset) e = { count: 0, reset: now + RATE_WINDOW_MS };
  e.count++;
  _rl.set(ip, e);
  return e.count <= RATE_LIMIT;
}

// ── ZIP extraction ─────────────────────────────────────────────────────────────
function extractZip(zipPath) {
  let zip;
  try {
    zip = new AdmZip(zipPath);
  } catch (err) {
    throw new Error(`Invalid or corrupted ZIP file: ${err.message}`);
  }

  const files  = [];
  const errors = [];

  for (const entry of zip.getEntries()) {
    // Skip directories
    if (entry.isDirectory) continue;

    // Normalize path separators
    let filePath = entry.entryName.replace(/\\/g, '/');

    // Skip system/hidden files
    if (SKIP_PATTERNS.some(p => filePath.includes(p))) continue;
    if (filePath.split('/').some(part => part.startsWith('.'))) continue;

    // Prevent path traversal
    const normalized = path.posix.normalize(filePath);
    if (normalized.startsWith('../') || normalized.includes('/../')) {
      errors.push(`Skipped (path traversal): ${filePath}`);
      continue;
    }
    filePath = normalized;

    // Skip empty file names
    if (!filePath || filePath === '.') continue;

    // Read file content as Buffer (handles binary + text)
    let content;
    try {
      content = entry.getData();
    } catch (err) {
      errors.push(`Skipped (unreadable): ${filePath} — ${err.message}`);
      continue;
    }

    if (!content || content.length === 0) continue;

    // Skip files exceeding GitHub's blob limit
    if (content.length > MAX_BLOB_BYTES) {
      errors.push(`Skipped (too large for GitHub: ${(content.length/1048576).toFixed(1)}MB): ${filePath}`);
      continue;
    }

    files.push({ path: filePath, content, size: content.length });
  }

  return { files, errors };
}

// ── Strip single common root directory ────────────────────────────────────────
// e.g. "myproject/src/a.js" → "src/a.js" when all files share "myproject/" root
function stripRoot(files) {
  if (files.length === 0) return files;

  const roots = [...new Set(files.map(f => f.path.split('/')[0]))];
  if (roots.length !== 1) return files;  // multiple roots → keep as-is

  const prefix   = roots[0] + '/';
  const stripped = files
    .map(f => ({
      ...f,
      path: f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path,
    }))
    .filter(f => f.path.length > 0);

  return stripped.length === files.length ? stripped : files;
}

// ── Create a single GitHub blob with retry ────────────────────────────────────
async function createBlobWithRetry(octokit, owner, repo, file, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await octokit.git.createBlob({
        owner,
        repo,
        content:  file.content.toString('base64'),
        encoding: 'base64',
      });
      return { path: file.path, sha: data.sha };
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw new Error(`Blob failed after ${retries} attempts [${file.path}]: ${lastError?.message}`);
}

// ── Create blobs in batches ────────────────────────────────────────────────────
async function createAllBlobs(octokit, owner, repo, files) {
  const blobs  = [];
  const failed = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch   = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(f => createBlobWithRetry(octokit, owner, repo, f))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled') {
        blobs.push(results[j].value);
      } else {
        failed.push({ path: batch[j].path, error: results[j].reason?.message });
        console.error(`[upload] Blob failed: ${batch[j].path} — ${results[j].reason?.message}`);
      }
    }
  }

  return { blobs, failed };
}

// ── Main handler ───────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // ── 1. Validate JWT ───────────────────────────────────────────────────────
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const GH_TOKEN = decoded.ghToken;
  if (!GH_TOKEN) {
    return res.status(401).json({ error: 'Token missing GitHub credentials. Please login again.' });
  }

  // ── 2. Rate limit ─────────────────────────────────────────────────────────
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (!rateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Wait a minute.' });
  }

  let tmpPath = null;

  try {
    // ── 3. Parse multipart upload ───────────────────────────────────────────
    const form = formidable({
      maxFileSize:    MAX_ZIP_SIZE,
      uploadDir:      '/tmp',
      keepExtensions: true,
      filename:       () => `sg-${crypto.randomBytes(8).toString('hex')}.zip`,
    });

    const [, files] = await new Promise((resolve, reject) =>
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve([fields, files])
      )
    );

    const uploaded = (files.zip || files.file || [])[0];
    if (!uploaded) {
      return res.status(400).json({ error: 'No file received. Use field name "zip".' });
    }

    tmpPath = uploaded.filepath;
    const originalName = uploaded.originalFilename || 'upload.zip';

    // ── 4. Validate ZIP magic bytes (PK header) ─────────────────────────────
    const magic = Buffer.alloc(4);
    const fd    = fs.openSync(tmpPath, 'r');
    fs.readSync(fd, magic, 0, 4, 0);
    fs.closeSync(fd);
    if (magic[0] !== 0x50 || magic[1] !== 0x4b) {
      return res.status(400).json({ error: 'File is not a valid ZIP archive.' });
    }

    // ── 5. Extract ZIP ──────────────────────────────────────────────────────
    const { files: rawFiles, errors: extractErrors } = extractZip(tmpPath);

    if (rawFiles.length === 0) {
      return res.status(400).json({
        error: 'ZIP contains no uploadable files.',
        details: extractErrors,
      });
    }

    const extractedFiles = stripRoot(rawFiles);
    const totalBytes     = extractedFiles.reduce((s, f) => s + f.size, 0);

    console.log(`[upload] Extracted ${extractedFiles.length} files, ${(totalBytes/1048576).toFixed(2)} MB`);
    if (extractErrors.length) {
      console.log(`[upload] Skipped ${extractErrors.length} entries:`, extractErrors);
    }

    // ── 6. Create GitHub repo ───────────────────────────────────────────────
    const octokit = new Octokit({ auth: GH_TOKEN });

    const { data: ghUser } = await octokit.users.getAuthenticated();
    const owner = ghUser.login;

    const base = originalName
      .replace(/\.zip$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 80);
    const repoName = `${base || 'upload'}-${crypto.randomBytes(3).toString('hex')}`;

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name:        repoName,
      description: `Uploaded via SebairGit · ${new Date().toISOString().split('T')[0]} · ${extractedFiles.length} files`,
      private:     false,
      auto_init:   true,
    });

    // Wait for GitHub to finish initialising the repo
    await new Promise(r => setTimeout(r, 2500));

    // ── 7. Get base tree SHA ────────────────────────────────────────────────
    const { data: ref }    = await octokit.git.getRef({ owner, repo: repoName, ref: `heads/${repo.default_branch}` });
    const { data: commit } = await octokit.git.getCommit({ owner, repo: repoName, commit_sha: ref.object.sha });

    // ── 8. Create all blobs (parallel batches with retry) ──────────────────
    const { blobs, failed: failedBlobs } = await createAllBlobs(octokit, owner, repoName, extractedFiles);

    if (blobs.length === 0) {
      throw new Error(`All ${extractedFiles.length} file uploads failed. Check GitHub API limits.`);
    }

    // ── 9. Create tree ──────────────────────────────────────────────────────
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo: repoName,
      base_tree: commit.tree.sha,
      tree: blobs.map(({ path: p, sha }) => ({
        path: p,
        mode: '100644',
        type: 'blob',
        sha,
      })),
    });

    // ── 10. Create commit ───────────────────────────────────────────────────
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo:    repoName,
      message: `chore: upload ${blobs.length} files via SebairGit`,
      tree:    newTree.sha,
      parents: [ref.object.sha],
    });

    // ── 11. Update branch ref ───────────────────────────────────────────────
    await octokit.git.updateRef({
      owner,
      repo:  repoName,
      ref:   `heads/${repo.default_branch}`,
      sha:   newCommit.sha,
      force: false,
    });

    // ── 12. Verify ──────────────────────────────────────────────────────────
    const { data: verifyTree } = await octokit.git.getTree({
      owner,
      repo:     repoName,
      tree_sha: newCommit.sha,
      recursive: '1',
    });

    const uploadedCount  = verifyTree.tree.filter(i => i.type === 'blob' && i.path !== 'README.md').length;
    const expectedCount  = extractedFiles.length;
    const verified       = uploadedCount >= expectedCount;

    return res.status(200).json({
      success:       true,
      repoUrl:       repo.html_url,
      repoName,
      owner,
      branch:        repo.default_branch,
      fileCount:     uploadedCount,
      expectedCount,
      verified,
      commitSha:     newCommit.sha.slice(0, 7),
      totalSizeKb:   Math.round(totalBytes / 1024),
      // Debug info
      skipped:       extractErrors.length,
      blobsFailed:   failedBlobs.length,
    });

  } catch (err) {
    console.error('[upload] Fatal error:', err.message);

    if (err.status === 401) return res.status(401).json({ error: 'GitHub token expired. Please login again.' });
    if (err.status === 403) return res.status(403).json({ error: 'GitHub permission denied. Check token scopes.' });
    if (err.status === 422) return res.status(422).json({ error: 'Repository name conflict. Try again.' });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'ZIP too large. Max 50 MB.' });

    return res.status(500).json({ error: err.message || 'Upload failed.' });

  } finally {
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }
};

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  'https://sebairgit-app.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}
