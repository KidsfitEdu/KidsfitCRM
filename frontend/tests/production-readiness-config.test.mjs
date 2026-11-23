import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..', '..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test('tracked appsettings has no default JWT signing secret or database credentials', () => {
  const app = JSON.parse(read('backend/src/KidsfitCRM.Api/appsettings.json'));
  assert.equal(app.ConnectionStrings, undefined);
  assert.equal(app.Jwt, undefined);
  assert.equal(app.Cors, undefined);
});

test('local compose requires private environment variables and does not bind MySQL publicly', () => {
  const compose = read('compose.yaml');
  assert.match(compose, /KIDSFIT_DB_PASSWORD:\?Set KIDSFIT_DB_PASSWORD/);
  assert.match(compose, /KIDSFIT_DB_ROOT_PASSWORD:\?Set KIDSFIT_DB_ROOT_PASSWORD/);
  assert.match(compose, /KIDSFIT_JWT_KEY:\?Set a private JWT/);
  assert.match(compose, /127\.0\.0\.1:3306:3306/);
  assert.doesNotMatch(compose, /MYSQL_ROOT_PASSWORD:\s*kidsfit_root_secret/);
});

test('frontend container is documented as development-only', () => {
  const dockerfile = read('frontend/Dockerfile');
  assert.match(dockerfile, /DEVELOPMENT-ONLY image/);
  assert.match(dockerfile, /npm", "run", "dev"/);
  assert.match(read('docs/operations/PRODUCTION_READINESS.md'), /NO-GO for production customer data/);
});

test('repository no longer executes retired static-demo test commands in baseline CI', () => {
  for (const path of ['.github/workflows/phase-0-baseline.yml', '.github/workflows/manager-escalation-ci.yml']) {
    const workflow = read(path);
    assert.doesNotMatch(workflow, /npm run test:demo|npm run build:pages/);
  }
  const legacy = read('.github/workflows/manager-escalation-ci.yml');
  assert.doesNotMatch(legacy, /git push origin HEAD|migrations add ProposalOverdueAlerts/);
});
