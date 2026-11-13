import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const component=readFileSync(resolve(import.meta.dirname,'../src/components/crm/SalesContractPeriodHistory.tsx'),'utf8');
const overview=readFileSync(resolve(import.meta.dirname,'../src/components/crm/SalesProtectionOverview.tsx'),'utf8');
const endpoint=readFileSync(resolve(import.meta.dirname,'../../backend/src/KidsfitCRM.Api/Features/SalesProtectionOverviewEndpoints.cs'),'utf8');

test('period history belongs inside the current protection drawer, not a new tab',()=>{
  assert.match(overview,/<SalesContractPeriodHistory key=\{selected.customer_id\}/);
  assert.match(component,/Hợp đồng & lịch sử tái ký/);
  assert.match(component,/aria-expanded=\{isOpen\}/);
  assert.match(component,/Tái ký lần/);
  assert.match(component,/service_confirmed/);
});

test('contract file shows only inline preview and download icons',()=>{
  assert.match(component,/EvidencePreviewDialog/);
  assert.match(component,/aria-label=\{'Xem file '/);
  assert.match(component,/aria-label=\{'Tải xuống '/);
  assert.match(component,/<Eye className="size-4"\/>/);
  assert.match(component,/<Download className="size-4"\/>/);
  assert.doesNotMatch(component,/>Xem file<\/Button>/);
  assert.doesNotMatch(component,/>Tải xuống<\/Button>/);
  assert.match(component,/Chưa có file hợp đồng đính kèm/);
});

test('period endpoint scopes owner and returns metadata only',()=>{
  assert.match(endpoint,/protection-overview\/\{customerId:long\}\/contracts/);
  assert.match(endpoint,/c.OwnerUserId == access.UserId/);
  assert.match(endpoint,/r.SubmittedByUserId == access.UserId/);
  assert.match(endpoint,/otherCurrentOwner/);
  assert.match(endpoint,/evidence = sourceProof is null/);
  assert.match(endpoint,/evidence = proof is null/);
  assert.match(endpoint,/renewal.Status == "CONFIRMED"/);
  assert.doesNotMatch(endpoint,/new \{[^}]*Bytes\s*=/);
});
