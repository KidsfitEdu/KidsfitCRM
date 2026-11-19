import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';

const front=readFileSync(resolve(import.meta.dirname,'../src/components/roles/ContractRenewalSalesPanel.tsx'),'utf8');
const server=readFileSync(resolve(import.meta.dirname,'../../backend/src/KidsfitCRM.Api/Features/ContractRenewalEndpoints.cs'),'utf8');
const migration=readFileSync(resolve(import.meta.dirname,'../../backend/src/KidsfitCRM.Api/Infrastructure/Migrations/20261118043000_RenewalContractCodes.cs'),'utf8');

test('Sales renewal form omits contract-code field, hint and request property',()=>{
  assert.doesNotMatch(front,/kc02-contract-code/);
  assert.doesNotMatch(front,/Mã hợp đồng tái ký sẽ được hệ thống tự động tạo/);
  assert.doesNotMatch(front,/contract_code:contractCode/);
  assert.doesNotMatch(front,/setContractCode/);
  assert.match(front,/idempotency_key:crypto.randomUUID\(\),signed_on:signedOn/);
});
test('Backend generates a renewal code when omitted and retains legacy optional code compatibility',()=>{
  assert.match(server,/GenerateRenewalContractCode\(DateTime utcNow\)/);
  assert.match(server,/HD-TK-\{utcNow:yyyy\}-\{Guid.NewGuid\(\):N\}/);
  assert.match(server,/string.IsNullOrWhiteSpace\(suppliedCode\)/);
  assert.match(server,/request.ContractCode\?\.Trim\(\).Length > 64/);
  assert.match(server,/db.SalesContracts.AnyAsync\(c => c.ContractCode == code/);
  assert.match(server,/db.ContractRenewals.AnyAsync\(c => c.ContractCode == code/);
});
test('Backend reuses the original renewal code on resubmit and keeps DB unique index',()=>{
  assert.match(server,/string.IsNullOrWhiteSpace\(renewal.ContractCode\)/);
  assert.match(server,/: renewal.ContractCode;/);
  assert.match(server,/renewal.ContractCode = code;/);
  assert.match(migration,/IX_contract_renewals_contract_code/);
  assert.match(migration,/unique: true/);
});
