'use strict';
/**
 * POST /api/upload
 * Production ZIP → GitHub upload
 * - JWT auth (HS256, server-verified)
 * - Plan-based limits from Supabase plan_limits table
 * - ZIP preview validation before upload starts
 * - GitHub Tree API with exponential backoff retry
 * - Full audit log to Supabase uploads table
 */
const path         = require('path');
const fs           = require('fs');
const crypto       = require('crypto');
const { Octokit }  = require('@octokit/rest');
const AdmZip       = require('adm-zip');
const formidable   = require('formidable');
const { setCORS, verifyJWT, db } = require('./_lib');

const BATCH_SIZE    = 5;
const MAX_RETRIES   = 3;
const SKIP_PATTERNS = ['__MACOSX', '.DS_Store', 'Thumbs.db', 'desktop.ini', '.git/', 'node_modules/'];

// ── Exponential backoff retry ─────────────────────────────────────────────
async function withRetry(fn, retries = MAX_RETRIES, label = '') {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = 500 * Math.pow(2, attempt - 1);
      console.warn(`[retry] ${label} attempt ${attempt}/${retries}: ${err.message} (${wait}ms)`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// ── ZIP extraction ────────────────────────────────────────────────────────
function extractZip(zipPath, limits) {
  let zip;
  try { zip = new AdmZip(zipPath); }
  catch (e) { throw new Error('Invalid or corrupted ZIP file.'); }

  const files = [], skipped = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    let filePath = entry.entryName.replace(/\\/g, '/');
    const norm   = path.posix.normalize(filePath);

    if (norm.startsWith('../') || norm.includes('/../')) { skipped.push('traversal: ' + filePath); continue; }
    if (SKIP_PATTERNS.some(p => filePath.includes(p)))   { skipped.push('system: '    + filePath); continue; }
    if (filePath.split('/').some(p => p.startsWith('.'))) { skipped.push('hidden: '    + filePath); continue; }

    let content;
    try { content = entry.getData(); }
    catch { skipped.push('unreadable: ' + filePath); continue; }
    if (!content?.length) continue;

    if (content.length > limits.max_file_bytes) {
      skipped.push(`too large (${(content.length/1048576).toFixed(1)}MB): ${filePath}`);
      continue;
    }

    files.push({ path: norm, content, size: content.length });
  }
  return { files, skipped };
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

// ── Blob creation with retry ───────────────────────────────────────────────
async function createBlobs(octokit, owner, repo, files) {
  const results = [], failed = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch   = files.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(f =>
        withRetry(
          () => octokit.git.createBlob({ owner, repo, content: f.content.toString('base64'), encoding: 'base64' })
              .then(r => ({ path: f.path, sha: r.data.sha })),
          MAX_RETRIES,
          `blob:${f.path}`
        )
      )
    );
    settled.forEach((r, j) => {
      if (r.status === 'fulfilled') results.push(r.value);
      else { console.error(`[blob] ${batch[j].path}: ${r.reason?.message}`); failed.push(batch[j].path); }
    });
  }
  return { results, failed };
}

// ── Main handler ──────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCORS(res, 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // 1. Authenticate
  let decoded;
  try { decoded = verifyJWT(req.headers.authorization); }
  catch (e) { return res.status(e.status || 401).json({ error: e.message }); }

  const userId  = decoded.sub;
  const ghToken = decoded.ghToken;
  if (!ghToken) return res.status(401).json({ error: 'Token missing GitHub credentials. Please login again.' });

  // 2. Plan limits
  const [user, limits] = await Promise.all([
    db.getUser(userId),
    db.getPlanLimits(decoded.plan || 'free'),
  ]).catch(e => { throw Object.assign(new Error('Database error: ' + e.message), { status: 500 }); });

  if (!user) return res.status(401).json({ error: 'User not found. Please login again.' });

  const todayCount = await db.todayUploadCount(userId);
  if (todayCount >= limits.max_uploads_day) {
    return res.status(429).json({
      error: `Daily upload limit reached (${limits.max_uploads_day}/day on ${user.plan} plan).`,
      plan: user.plan,
    });
  }

  // 3. Parse multipart
  const form = formidable({
    maxFileSize:    limits.max_file_bytes,
    uploadDir:      '/tmp',
    keepExtensions: true,
    filename:       () => `sg-${crypto.randomBytes(8).toString('hex')}.zip`,
  });

  let tmpPath = null, uploadId = null;

  try {
    const [, files] = await new Promise((resolve, reject) =>
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve([fields, files]))
    );

    const uploaded = (files.zip || files.file || [])[0];
    if (!uploaded) return res.status(400).json({ error: 'No file received. Use field name "zip".' });

    tmpPath = uploaded.filepath;
    const originalName = uploaded.originalFilename || 'upload.zip';
    const fileSize     = uploaded.size || 0;

    // 4. Validate ZIP magic bytes
    const magic = Buffer.alloc(4);
    const fd    = fs.openSync(tmpPath, 'r');
    fs.readSync(fd, magic, 0, 4, 0);
    fs.closeSync(fd);
    if (magic[0] !== 0x50 || magic[1] !== 0x4b)
      return res.status(400).json({ error: 'File is not a valid ZIP archive.' });

    // 5. Extract
    const { files: rawFiles, skipped } = extractZip(tmpPath, limits);
    const extractedFiles = stripRoot(rawFiles);

    if (!extractedFiles.length)
      return res.status(400).json({ error: 'ZIP contains no uploadable files.', skipped });

    if (extractedFiles.length > limits.max_files)
      return res.status(400).json({
        error: `ZIP has ${extractedFiles.length} files. Limit is ${limits.max_files} on ${user.plan} plan.`,
        plan: user.plan,
      });

    const totalBytes = extractedFiles.reduce((s, f) => s + f.size, 0);
    const startMs    = Date.now();

    // 6. Create pending DB record
    const record = await db.saveUpload({
      user_id: userId, original_name: originalName,
      file_size_bytes: fileSize, file_count: extractedFiles.length, status: 'pending',
    });
    uploadId = record?.id;

    // 7. GitHub setup
    const octokit = new Octokit({ auth: ghToken });
    const { data: ghUser } = await octokit.users.getAuthenticated();
    const owner = ghUser.login;

    const base = originalName
      .replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-{2,}/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
    const repoName = `${base || 'upload'}-${crypto.randomBytes(3).toString('hex')}`;

    console.log(`[upload] ${owner}/${repoName}: ${extractedFiles.length} files, ${(totalBytes/1048576).toFixed(2)}MB`);

    // 8. Create repo
    const { data: repo } = await withRetry(
      () => octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: `Uploaded via SebairGit · ${new Date().toISOString().split('T')[0]} · ${extractedFiles.length} files`,
        private: false, auto_init: true,
      }), MAX_RETRIES, 'create_repo'
    );

    await new Promise(r => setTimeout(r, 2500));

    // 9. Get base commit
    const { data: ref }        = await withRetry(() => octokit.git.getRef({ owner, repo: repoName, ref: `heads/${repo.default_branch}` }), MAX_RETRIES, 'get_ref');
    const { data: baseCommit } = await withRetry(() => octokit.git.getCommit({ owner, repo: repoName, commit_sha: ref.object.sha }), MAX_RETRIES, 'get_commit');

    // 10. Create blobs
    console.log(`[upload] Creating ${extractedFiles.length} blobs...`);
    const { results: blobs, failed: failedBlobs } = await createBlobs(octokit, owner, repoName, extractedFiles);
    if (!blobs.length) throw new Error('All blob creations failed. GitHub API may be unavailable.');

    // 11. Create tree
    const { data: newTree } = await withRetry(
      () => octokit.git.createTree({
        owner, repo: repoName,
        base_tree: baseCommit.tree.sha,
        tree: blobs.map(({ path: p, sha }) => ({ path: p, mode: '100644', type: 'blob', sha })),
      }), MAX_RETRIES, 'create_tree'
    );

    // 12. Commit
    const { data: newCommit } = await withRetry(
      () => octokit.git.createCommit({ owner, repo: repoName, message: `chore: upload ${blobs.length} files via SebairGit`, tree: newTree.sha, parents: [ref.object.sha] }),
      MAX_RETRIES, 'create_commit'
    );

    await withRetry(
      () => octokit.git.updateRef({ owner, repo: repoName, ref: `heads/${repo.default_branch}`, sha: newCommit.sha }),
      MAX_RETRIES, 'update_ref'
    );

    // 13. Verify
    const { data: verifyTree } = await octokit.git.getTree({ owner, repo: repoName, tree_sha: newCommit.sha, recursive: '1' });
    const uploadedCount = verifyTree.tree.filter(i => i.type === 'blob' && i.path !== 'README.md').length;
    const verified      = uploadedCount >= extractedFiles.length;
    const durationMs    = Date.now() - startMs;

    console.log(`[upload] Done: ${uploadedCount}/${extractedFiles.length} verified=${verified} (${durationMs}ms)`);

    // 14. Update DB
    if (uploadId) {
      await db.updateUpload(uploadId, {
        repo_name: repoName, repo_url: repo.html_url, repo_owner: owner,
        branch: repo.default_branch, commit_sha: newCommit.sha.slice(0, 7),
        file_count: uploadedCount, status: verified ? 'success' : 'error',
        error_message: verified ? null : `Only ${uploadedCount}/${extractedFiles.length} files uploaded`,
        duration_ms: durationMs,
      });
    }

    db.incrementStats(userId, uploadedCount, totalBytes).catch(e => console.error('[stats]', e.message));

    return res.status(200).json({
      success: true, repoUrl: repo.html_url, repoName, owner,
      branch: repo.default_branch, fileCount: uploadedCount,
      expectedCount: extractedFiles.length, verified,
      commitSha: newCommit.sha.slice(0, 7),
      totalSizeKb: Math.round(totalBytes / 1024), durationMs,
      skipped: skipped.length, failedBlobs: failedBlobs.length,
    });

  } catch (err) {
    console.error('[upload] Fatal:', err.message);
    if (uploadId) db.updateUpload(uploadId, { status: 'error', error_message: err.message?.slice(0, 500) }).catch(() => {});
    if (err.status === 401)     return res.status(401).json({ error: 'GitHub token expired. Please login again.' });
    if (err.status === 403)     return res.status(403).json({ error: 'GitHub permission denied.' });
    if (err.status === 422)     return res.status(422).json({ error: 'Repository name conflict. Try again.' });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large for your plan.' });
    return res.status(500).json({ error: err.message || 'Upload failed.' });

  } finally {
    if (tmpPath) try { fs.unlinkSync(tmpPath); } catch {}
  }
};
