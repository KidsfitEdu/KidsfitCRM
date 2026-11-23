import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', 'src', path), 'utf8');

test('My Schools drawer has one shared profile and no legacy duplicate cards', () => {
  const source = read('components/crm/channel-sales-view.tsx');
  const start = source.indexOf('<AppDrawer open={detailCustomer !== null}');
  const end = source.indexOf('</AppDrawer>', start);
  assert.ok(start >= 0 && end > start, 'Sales school details drawer exists');
  const drawer = source.slice(start, end);
  assert.equal((drawer.match(/<SchoolProfileDetails\b/g) ?? []).length, 1);
  assert.doesNotMatch(drawer, /<section\b/);
  assert.doesNotMatch(drawer, /<h2\b/);
  assert.match(drawer, /units=\{schoolProfile\.school_units\}/);
  assert.match(drawer, /displayName=\{schoolProfile\.data\.display_name\}/);
  assert.match(drawer, /statusLabel=\{detailCustomer \? contractBadge\(detailCustomer\)\.label : undefined\}/);
  assert.match(drawer, /taxCode=\{schoolProfile\.data\.tax_code\}/);
  assert.match(drawer, /profileError/);
  assert.match(drawer, /Đang tải thông tin trường/);
});

test('proposal drawers match the school detail panel dimensions and share workflow metadata', () => {
  const entries = [
    'components/crm/school-operations.tsx',
    'components/roles/ManagerWorklists.tsx',
    'screens/Admin/Proposals/ProposalsPage.tsx',
  ];
  for (const path of entries) {
    const source = read(path);
    const profile = source.match(/<SchoolProfileDetails\\b[\\s\\S]*?\\/>/)?.[0];
    const workflow = source.match(/<SchoolProposalWorkflowDetails\\b[\\s\\S]*?\\/>/)?.[0];
    assert.ok(profile, path + ': shared profile present');
    assert.ok(workflow, path + ': shared workflow card present');
    assert.match(profile, /statusLabel=/);
    assert.match(profile, /schoolCode=/);
    assert.match(profile, /displayName=/);
    assert.match(workflow, /submittedBy=/);
    assert.match(workflow, /managerName=/);
    assert.match(workflow, /formatReviewDueAt=/);
    assert.match(source, /compactHeader/);
    assert.match(source, /bodyClassName="space-y-4 bg-muted\\/10"/);
    assert.doesNotMatch(source, /wide(?:=\\{selectedProposal !== null\\})?/);
  }
  const workflow = read('components/crm/schools/school-proposal-workflow-details.tsx');
  assert.match(workflow, /Thông tin xử lý đề xuất/);
  assert.match(workflow, /Người đề xuất/);
  assert.match(workflow, /Hạn xử lý/);
  assert.doesNotMatch(workflow, /label="Trạng thái"/);
});
