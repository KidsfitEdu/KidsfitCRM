import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read=path=>readFileSync(resolve(import.meta.dirname,'..',path),'utf8');

test('Manager contract screen has just the original review table',()=>{
 const manager=read('src/screens/SalesManager/Contracts/ContractsPage.tsx');
 assert.match(manager,/\/school-contracts\/reviews/);
 assert.equal((manager.match(/<table\b/g)||[]).length,1);
 assert.doesNotMatch(manager,/ProtectionRenewalPanel|ServiceInterruptionPanel/);
 assert.match(manager,/Duyệt & gửi CHECKEE/);
});

test('Sales and CTV do not submit separate five-year protection requests',()=>{
 const sales=read('src/components/crm/SalesProtectionOverview.tsx');
 const ctv=read('src/screens/Collaborator/CollaboratorWorkspace.tsx');
 assert.doesNotMatch(sales,/request-review|requestReview|icon=\{Send\}/);
 assert.doesNotMatch(ctv,/ProtectionRenewalPanel/);
 assert.match(ctv,/SalesProtectionOverview/);
 assert.match(ctv,/subview==='protection'/);
 assert.match(ctv,/Quản lý quyền bảo vệ/);
 assert.match(sales,/Kế toán đã xác nhận kỳ tiếp tục/);
});

test('Backend removes Sales request and Manager approval routes',()=>{
 const api=read('../backend/src/KidsfitCRM.Api/Features/ProtectionRenewalEndpoints.cs');
 assert.doesNotMatch(api,/MapPost\("\/protection-renewals|MapPost\("\/contracts\/\{contractId:long\}\/protection-renewal\/request-review/);
 assert.match(api,/can_approve = false/);
 const renewal=read('../backend/src/KidsfitCRM.Api/Features/ContractRenewalEndpoints.cs');
 assert.match(renewal,/AutomaticProtectionRenewal\.TryGrantAsync/);
 const worker=read('../backend/src/KidsfitCRM.Api/Infrastructure/ProtectionRenewalPolicy.cs');
 assert.match(worker,/AutomaticProtectionRenewal\.TryGrantAsync/);
});

test('Renewal rights depend on verified continuation and are not granted annually',()=>{
 const source=read('../backend/src/KidsfitCRM.Api/Infrastructure/AutomaticProtectionRenewal.cs');
 for (const expression of [
  /now < previous\.EffectiveUntil/,
  /ProtectionRenewalPolicy\.HasConfirmedContinuationAsync/,
  /ServiceInterruptionService\.AssessAsync/,
  /ServiceInterruptionEvents\.AnyAsync/,
  /CustomerProtections\.AnyAsync/,
  /NewProtectionUntil = until/,
 ]) assert.match(source,expression);
});

test('Accounting shows automatic protection result without new manual approval',()=>{
 const ui=read('src/screens/Accounting/Contracts/ContractRenewalAccountingPanel.tsx');
 assert.match(ui,/CRM tự tính/);
 assert.match(ui,/protection_case/);
 assert.match(ui,/Tái ký hằng năm không tự cộng thêm 5 năm/);
 assert.doesNotMatch(ui,/Duyệt bảo vệ 5 năm/);
});
