import assert from 'node:assert/strict';
import test from 'node:test';
import { demoAccounts } from '../lib/demo-auth.ts';
import { demoChannelSalesWorkspace } from '../lib/channel-sales.ts';
import {
  loadProductWorkspace,
  productNavigation,
} from '../lib/product-workspace.ts';

test('every channel profile gets product navigation without education modules', () => {
  for (const account of demoAccounts) {
    assert.deepEqual(
      productNavigation(account.abilities).map((item) => item.id),
      ['overview', 'registrations'],
    );
  }
  // Historical education permissions alone cannot open the product CRM.
  assert.deepEqual(
    productNavigation(['student.view', 'course.view', 'crm.dashboard.view']),
    [],
  );
});

test('live product workspace reads only identity and authorized sales data', async () => {
  const calls = [];
  const user = {
    name: 'Product operator',
    abilities: ['channel_sales.customer.view'],
  };
  const result = await loadProductWorkspace(async (path, token) => {
    calls.push([path, token]);
    if (path === '/me') return { user };
    if (path === '/channel-sales/workspace') return demoChannelSalesWorkspace;
    throw new Error(`Unexpected endpoint: ${path}`);
  }, 'test-session');
  assert.deepEqual(calls, [
    ['/me', 'test-session'],
    ['/channel-sales/workspace', 'test-session'],
  ]);
  assert.equal(result.workspace, demoChannelSalesWorkspace);
});

test('missing channel permission never loads legacy modules or customer data', async () => {
  const calls = [];
  const result = await loadProductWorkspace(async (path) => {
    calls.push(path);
    return {
      user: {
        name: 'Legacy operator',
        abilities: ['student.view', 'course.view'],
      },
    };
  }, 'test-session');
  assert.deepEqual(calls, ['/me']);
  assert.equal(result.workspace, null);
});

test('failed identity or sales requests do not fall back to public fixtures', async () => {
  await assert.rejects(
    () =>
      loadProductWorkspace(async () => {
        throw new Error('unauthorized');
      }, 'expired'),
    /unauthorized/,
  );
  await assert.rejects(
    () =>
      loadProductWorkspace(async (path) => {
        if (path === '/me')
          return {
            user: {
              name: 'Operator',
              abilities: ['channel_sales.customer.view'],
            },
          };
        throw new Error('sales service unavailable');
      }, 'valid'),
    /sales service unavailable/,
  );
});
