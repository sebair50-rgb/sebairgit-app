/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const { Octokit }  = require('@octokit/rest');
const AdmZip   = require('adm-zip');
const formidable = require('formidable');

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE   = 50 * 1024 * 1024; // 50 MB
const BATCH_SIZE      = 8;                 // concurrent blob creations
const RATE_LIMIT      = 10;               // requests per window per IP
const RATE_WINDOW_MS  = 60 * 1000;

// Patterns to skip when extracting
const SKIP_PATTERNS = [
  '__MACOSX',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  '.git/',
  '.git\\',
];

// ─── In-memory rate limiter (per cold start, good enough for serverless) ──────
const _rl = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  let e = _rl.get(ip);
  if (!e || now > e.reset) e = { count: 0, reset: now + RATE_WINDOW_MS };
  e.count++;
  _rl.set(ip, e);
  return e.count <= RATE_LIMIT;
}

// ─── ZIP extraction ────────────────────────────────────────────────────────────
function extractZip(zipPath) {
  let zip;
  try {
    zip = new AdmZip(zipPath);
  } catch (err) {
    throw new Error('Invalid or corrupted ZIP file.');
  }

  const entries = zip.getEntries();
  const files   = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const rawName = entry.entryName.replace(/\\/g, '/');

    // Security: no path traversal
    const normalised = path.posix.normalize(rawName);
    if (normalised.startsWith('../') || normalised.includes('/../')) continue;

    // Skip system / hidden files
    if (SKIP_PATTERNS.some(p => rawName.includes(p))) continue;

    let content;
    try {
      content = entry.getData();
    } catch {
      continue; // skip unreadable entry
    }

    if (!content || content.length === 0) continue;

    files.push({ path: normalised, content, size: content.length });
  }

  return files;
}

// ─── Strip single common root dir ─────────────────────────────────────────────
function stripRoot(files) {
  if (files.length === 0) return files;

  const roots = [...new Set(files.map(f => f.path.split('/')[0]))];
  if (roots.length === 1) {
    const prefix = roots[0] + '/';
    const stripped = files
      .map(f => ({ ...f, path: f.path.startsWith(prefix) ? f.path.slice(prefix.length) : f.path }))
      .filter(f => f.path.length > 0);
    if (stripped.length === files.length) return stripped;
  }
  return files;
}

// ─── GitHub blob creation (parallel, batched) ─────────────────────────────────
async function createBlobs(octokit, owner, repo, files) {
  const results = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async file => {
        const { data } = await octokit.git.createBlob({
          owner,
          repo,
          content:  file.content.toString('base64'),
          encoding: 'base64',
        });
        return { path: file.path, sha: data.sha };
      })
    );
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value);
      else console.error('Blob error:', r.reason?.message);
    }
  }
  return results;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').split(',')[0].trim();
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server misconfigured: missing GitHub token.' });
  }

  let tmpPath = null;

  try {
    // ── Parse multipart upload ──────────────────────────────────────────────
    const form = formidable({
      maxFileSize:   MAX_FILE_SIZE,
      uploadDir:     '/tmp',
      keepExtensions: true,
      filename: (_name, _ext, part) => {
        const safe = crypto.randomBytes(8).toString('hex');
        return `sebairgit-${safe}.zip`;
      },
    });

    const [, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });

    // Support both field names: "zip" and "file"
    const uploaded = (files.zip || files.file || [])[0];
    if (!uploaded) {
      return res.status(400).json({ error: 'No file received. Use form field "zip".' });
    }

    tmpPath = uploaded.filepath;
    const originalName = uploaded.originalFilename || 'upload.zip';

    // Validate type by magic bytes (PK\x03\x04)
    const magic = Buffer.alloc(4);
    const fd    = fs.openSync(tmpPath, 'r');
    fs.readSync(fd, magic, 0, 4, 0);
    fs.closeSync(fd);
    if (magic[0] !== 0x50 || magic[1] !== 0x4b) {
      return res.status(400).json({ error: 'File is not a valid ZIP archive.' });
    }

    // ── Extract ZIP ─────────────────────────────────────────────────────────
    let extractedFiles = extractZip(tmpPath);
    if (extractedFiles.length === 0) {
      return res.status(400).json({ error: 'ZIP is empty or contains no readable files.' });
    }

    extractedFiles = stripRoot(extractedFiles);

    const totalBytes = extractedFiles.reduce((s, f) => s + f.size, 0);
    console.log(`Extracted ${extractedFiles.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

    // ── GitHub setup ────────────────────────────────────────────────────────
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    const { data: ghUser } = await octokit.users.getAuthenticated();
    const owner = ghUser.login;

    // Generate unique repo name
    const baseName = originalName
      .replace(/\.zip$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 80);

    const suffix   = crypto.randomBytes(3).toString('hex');
    const repoName = `${baseName || 'upload'}-${suffix}`;

    // ── Create GitHub repository ────────────────────────────────────────────
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name:        repoName,
      description: `Uploaded via SebairGit · ${new Date().toISOString().split('T')[0]} · ${extractedFiles.length} files`,
      private:     false,
      auto_init:   true,
    });

    // Brief delay for GitHub to finish initialising
    await new Promise(r => setTimeout(r, 2000));

    // ── Get base commit & tree ──────────────────────────────────────────────
    const { data: ref } = await octokit.git.getRef({
      owner, repo: repoName,
      ref: `heads/${repo.default_branch}`,
    });
    const baseCommitSha = ref.object.sha;

    const { data: baseCommit } = await octokit.git.getCommit({
      owner, repo: repoName, commit_sha: baseCommitSha,
    });
    const baseTreeSha = baseCommit.tree.sha;

    // ── Create blobs ────────────────────────────────────────────────────────
    console.log(`Creating ${extractedFiles.length} blobs…`);
    const blobs = await createBlobs(octokit, owner, repoName, extractedFiles);

    if (blobs.length === 0) {
      throw new Error('Failed to create any file blobs on GitHub.');
    }

    // ── Create tree ─────────────────────────────────────────────────────────
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo: repoName,
      base_tree: baseTreeSha,
      tree: blobs.map(({ path: p, sha }) => ({
        path: p,
        mode: '100644',
        type: 'blob',
        sha,
      })),
    });

    // ── Create commit ────────────────────────────────────────────────────────
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo: repoName,
      message: `chore: upload ${blobs.length} files via SebairGit`,
      tree:    newTree.sha,
      parents: [baseCommitSha],
    });

    // ── Update branch ref ────────────────────────────────────────────────────
    await octokit.git.updateRef({
      owner,
      repo: repoName,
      ref:   `heads/${repo.default_branch}`,
      sha:   newCommit.sha,
      force: false,
    });

    // ── Verification ─────────────────────────────────────────────────────────
    const { data: verifyTree } = await octokit.git.getTree({
      owner,
      repo: repoName,
      tree_sha: newCommit.sha,
      recursive: '1',
    });

    const uploadedBlobs = verifyTree.tree.filter(i => i.type === 'blob' && i.path !== 'README.md');
    const expectedCount = extractedFiles.length;
    const actualCount   = uploadedBlobs.length;
    const verified      = actualCount >= expectedCount;

    // Auto-fix: retry any missing files
    if (!verified) {
      console.warn(`Verification gap: expected ${expectedCount}, got ${actualCount}. Retrying missing…`);
      const uploaded_paths = new Set(uploadedBlobs.map(b => b.path));
      const missing = extractedFiles.filter(f => !uploaded_paths.has(f.path));

      if (missing.length > 0) {
        const retryBlobs = await createBlobs(octokit, owner, repoName, missing);
        if (retryBlobs.length > 0) {
          const { data: retryTree } = await octokit.git.createTree({
            owner, repo: repoName,
            base_tree: newTree.sha,
            tree: retryBlobs.map(({ path: p, sha }) => ({ path: p, mode: '100644', type: 'blob', sha })),
          });
          const { data: retryCommit } = await octokit.git.createCommit({
            owner, repo: repoName,
            message: `fix: retry ${retryBlobs.length} missing files`,
            tree: retryTree.sha,
            parents: [newCommit.sha],
          });
          await octokit.git.updateRef({ owner, repo: repoName, ref: `heads/${repo.default_branch}`, sha: retryCommit.sha });
        }
      }
    }

    return res.status(200).json({
      success:       true,
      repoUrl:       repo.html_url,
      repoName,
      owner,
      branch:        repo.default_branch,
      fileCount:     actualCount,
      expectedCount,
      verified:      actualCount >= expectedCount,
      commitSha:     newCommit.sha.slice(0, 7),
      totalSizeKb:   Math.round(totalBytes / 1024),
    });

  } catch (err) {
    console.error('Upload handler error:', err);

    if (err.status === 422) {
      return res.status(422).json({ error: 'Repository name conflict. Please try again.' });
    }
    if (err.status === 401 || err.status === 403) {
      return res.status(500).json({ error: 'GitHub authentication failed.' });
    }
    if (err.code === 'LIMIT_FILE_SIZE' || err.httpCode === 413) {
      return res.status(413).json({ error: 'File too large. Maximum is 50 MB.' });
    }

    return res.status(500).json({
      error: err.message || 'Upload failed. Please try again.',
    });

  } finally {
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }
};
