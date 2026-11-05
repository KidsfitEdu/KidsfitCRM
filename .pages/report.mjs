import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Runs only in GitHub Actions. Publish sanitized deployment evidence through Git
// so it is readable even when this cloud machine cannot reach GitHub's API.
const api = process.env.GITHUB_API_URL || 'https://api.github.com';
const repository = process.env.GITHUB_REPOSITORY;
const branch = 'pages-demo-report';
const dir = process.env.PAGES_REPORT_DIR;
if (!repository || !dir || !process.env.GITHUB_TOKEN) throw new Error('GitHub Actions report context is required.');
async function request(path, method = 'GET', body, allowMissing = false) {
  const response = await fetch(`${api}/repos/${repository}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`Report API ${method} ${path}: HTTP ${response.status}`);
  return response.json();
}
const steps = JSON.parse(process.env.PAGES_STEP_RESULTS || '{}');
const status = {
  phase: process.env.PAGES_REPORT_PHASE || 'verification',
  release: process.env.GITHUB_SHA,
  source: 'bddb6aae02e935a9fcea431c699c59c4793d398e',
  run_url: `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  recorded_at: new Date().toISOString(),
  steps: Object.fromEntries(Object.entries(steps).map(([id, value]) => [id, value.outcome])),
};
const files = new Map();
try { status.verification = JSON.parse(await readFile(join(dir, 'verification.json'), 'utf8')); } catch { /* Build may have failed before verification. */ }
status.passed = status.phase === 'verification' && steps.public_check?.outcome === 'success' && status.verification?.passed === true;
files.set('status.json', Buffer.from(JSON.stringify(status, null, 2) + '\n'));
for (const name of ['login-desktop.png', 'login-mobile.png']) {
  try { files.set(name, await readFile(join(dir, name))); } catch { /* Optional on failure. */ }
}
const tree = [];
for (const [path, bytes] of files) {
  const blob = await request('/git/blobs', 'POST', { encoding: 'base64', content: bytes.toString('base64') });
  tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
}
const previous = await request(`/git/ref/heads/${branch}`, 'GET', undefined, true);
const createdTree = await request('/git/trees', 'POST', { tree });
const commit = await request('/git/commits', 'POST', {
  message: `Record public demo release ${process.env.GITHUB_SHA}`,
  tree: createdTree.sha,
  parents: previous ? [previous.object.sha] : [],
});
if (previous) await request(`/git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha });
else await request('/git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: commit.sha });
console.log(`Deployment report saved to ${branch}: ${status.passed ? 'passed' : 'failed'}`);
