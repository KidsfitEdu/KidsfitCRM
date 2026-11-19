import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const table=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractTreeTable.tsx'),'utf8');
const badge=readFileSync(resolve(import.meta.dirname,'../src/components/common/app-status-badge.tsx'),'utf8');

test('contract group headers show school and contract count, no duplicate action count',()=>{
  assert.doesNotMatch(table,/const tasks=contracts\.filter|\{tasks\} cần xử lý/);
  assert.match(table,/\{contracts\.length\} hợp đồng/);
  assert.match(table,/aria-expanded=\{!collapsed\}/);
});
test('desktop contracts retain seven balanced fixed columns',()=>{
  const columns=table.slice(table.indexOf('<colgroup>'),table.indexOf('</colgroup>'));
  const widths=[...columns.matchAll(/width:'(\d+)%'/g)].map(m=>Number(m[1]));
  assert.deepEqual(widths,[24,12,17,13,13,13,8]);
  assert.equal(widths.reduce((sum,v)=>sum+v,0),100);
  assert.equal((table.match(/<th scope="col"/g)??[]).length,7);
});
test('action badges are shared and never wrap in both desktop and compact layouts',()=>{
  assert.match(table,/function ContractActionStatus/);
  assert.match(table,/status=\{action\} label=\{label\} size="sm" variant="kidsfit-action"/);
  assert.equal((table.match(/<ContractActionStatus action=\{p\.action\}\/>/g)??[]).length,2);
  assert.match(table,/\[&>span\]:whitespace-nowrap/);
  for(const code of ['CONFIRM_RENEWAL','NEEDS_INFO','REVIEW_PERIOD'])assert.match(badge,new RegExp('\\b'+code+':'));
});
test('table exposes only the eye view action for both desktop and compact rows',()=>{
  assert.equal((table.match(/<ContractActions row=\{row\} p=\{p\} onView=\{onView\}\/>/g)??[]).length,2);
  assert.match(table,/icon=\{Eye\}/);
  assert.match(table,/onClick=\{\(\)=>onView\(row.id,p.renewalId\)\}/);
  assert.doesNotMatch(table,/onReview|onRequestInfo|CheckCircle2|FilePenLine|canConfirm|canRequestInfo/);
  assert.match(table,/@min-\[1100px\]:block/);
  assert.match(table,/@min-\[1100px\]:hidden/);
  assert.match(table,/\(!needsAction\|\|p.action!==null\)/);
});
test('accounting decision buttons remain inside the detail drawer',()=>{
  const detail=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractDetailContent.tsx'),'utf8');
  const inline=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingRenewalInline.tsx'),'utf8');
  const page=readFileSync(resolve(import.meta.dirname,'../src/screens/Accounting/Contracts/AccountingContractsPage.tsx'),'utf8');
  assert.match(detail,/<AccountingRenewalInline /);
  assert.match(inline,/onClick=\{\(\)=>openDecision\('confirm'\)\}/);
  assert.match(inline,/onClick=\{\(\)=>openDecision\('request-info'\)\}/);
  assert.match(inline,/onClick=\{\(\)=>openDecision\('reject'\)\}/);
  assert.match(page,/onView=\{\(contractId,renewalId\)=>openContract\(contractId,renewalId\)\}/);
  assert.doesNotMatch(page,/openRenewal\(contractId,renewalId/);
});
