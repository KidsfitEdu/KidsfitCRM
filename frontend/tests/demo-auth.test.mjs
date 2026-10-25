import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authenticateDemo,
  demoAccounts,
  demoLoginEmail,
  DEMO_PASSWORD,
  DEMO_SESSION_KEY,
  readDemoSession,
  saveDemoSession,
  presentDemoWorkspace,
} from '../lib/demo-auth.ts';
import { demoChannelSalesWorkspace } from '../lib/channel-sales.ts';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('all nine demo accounts log in with a distinct, public demo password', () => {
  assert.equal(demoAccounts.length, 9);
  assert.equal(new Set(demoAccounts.map((a) => a.id)).size, 9);
  assert.equal(new Set(demoAccounts.map((a) => a.email)).size, 9);
  for (const account of demoAccounts) {
    assert.match(account.email, /@demo\.kidsfit\.example$/);
    assert.equal(authenticateDemo(account.email, DEMO_PASSWORD), account);
    assert.ok(account.abilities.includes('channel_sales.customer.view'));
    assert.ok(!account.abilities.includes('*'));
  }
});

test('invalid, real-system and blank credentials do not enter the mock workspace', () => {
  assert.equal(authenticateDemo('admin@kidsfit.vn', 'Kidsfit@2026'), null);
  assert.equal(authenticateDemo(demoAccounts[0].email, 'wrong'), null);
  assert.equal(
    authenticateDemo('unknown@demo.kidsfit.example', DEMO_PASSWORD),
    null,
  );
  assert.equal(authenticateDemo('', ''), null);
  assert.equal(
    authenticateDemo(` ${demoAccounts[0].email.toUpperCase()} `, DEMO_PASSWORD),
    demoAccounts[0],
  );
});

test('neutral public names and email aliases preserve all legacy logins', () => {
  for (const account of demoAccounts) {
    assert.doesNotMatch(account.name, /demo/i);
    assert.doesNotMatch(demoLoginEmail(account), /demo/i);
    assert.equal(
      authenticateDemo(demoLoginEmail(account), DEMO_PASSWORD),
      account,
    );
    assert.equal(authenticateDemo(account.email, DEMO_PASSWORD), account);
  }
});

test('session restores only a catalog ID, never stored abilities or a real token', () => {
  const storage = memoryStorage();
  storage.setItem('kidsfit_token', 'real-session-not-for-demo');
  assert.equal(readDemoSession(storage), null);
  saveDemoSession(storage, demoAccounts[5]);
  assert.equal(storage.getItem(DEMO_SESSION_KEY), 'sales');
  assert.equal(readDemoSession(storage), demoAccounts[5]);
  storage.setItem(
    DEMO_SESSION_KEY,
    JSON.stringify({ id: 'admin', abilities: ['*'] }),
  );
  assert.equal(readDemoSession(storage), null);
  storage.setItem(DEMO_SESSION_KEY, 'deleted-profile');
  assert.equal(readDemoSession(storage), null);
});

test('demo logout removes the demo identity without affecting the live API session', () => {
  const storage = memoryStorage();
  storage.setItem('kidsfit_token', 'untouched');
  saveDemoSession(storage, demoAccounts[0]);
  saveDemoSession(storage, null);
  assert.equal(readDemoSession(storage), null);
  assert.equal(storage.getItem('kidsfit_token'), 'untouched');
});

test('disabled session storage fails closed and supports memory-only login', () => {
  const disabled = {
    getItem() {
      throw new Error('disabled');
    },
    setItem() {
      throw new Error('disabled');
    },
    removeItem() {
      throw new Error('disabled');
    },
  };
  assert.equal(readDemoSession(disabled), null);
  assert.doesNotThrow(() => saveDemoSession(disabled, demoAccounts[0]));
  assert.doesNotThrow(() => saveDemoSession(disabled, null));
});

test('demo menu/action bundles distinguish read-only, sales and accounting', () => {
  const byId = (id) => demoAccounts.find((a) => a.id === id).abilities;
  assert.ok(byId('admin').includes('payment.create'));
  assert.ok(byId('sales').includes('crm.lead.create'));
  assert.ok(!byId('sales').includes('payment.create'));
  assert.ok(!byId('board').includes('channel_sales.approach.register'));
  assert.ok(!byId('board').includes('crm.dashboard.view'));
  assert.ok(byId('accountant').includes('channel_sales.revenue.record'));
  assert.ok(!byId('accountant').includes('channel_sales.contract.report'));
  assert.ok(byId('care').includes('channel_sales.activity.create'));
  assert.ok(!byId('care').includes('channel_sales.commission.view'));
  assert.ok(byId('checkee').includes('channel_sales.reconcile'));
  assert.ok(!byId('checkee').includes('channel_sales.commission.view'));
  assert.ok(byId('partner').includes('channel_sales.team.manage'));
  assert.ok(!byId('ctv').includes('channel_sales.team.manage'));
});

test('CHECKEE and care views hide internal finance without mutating shared fixtures', () => {
  const original = structuredClone(demoChannelSalesWorkspace);
  for (const id of ['checkee', 'care']) {
    const account = demoAccounts.find((a) => a.id === id);
    const workspace = presentDemoWorkspace(demoChannelSalesWorkspace, account);
    assert.deepEqual(workspace.capabilities, {
      view_revenue: false,
      view_commission: false,
    });
    assert.equal(workspace.metrics.collected_revenue, 0);
    assert.equal(workspace.metrics.commission_accrued, 0);
    assert.ok(
      workspace.data.every(
        (c) => c.collected_revenue === 0 && c.commission_accrued === 0,
      ),
    );
  }
  assert.deepEqual(demoChannelSalesWorkspace, original);
  const adminView = presentDemoWorkspace(
    demoChannelSalesWorkspace,
    demoAccounts[0],
  );
  assert.equal(
    adminView.metrics.collected_revenue,
    original.metrics.collected_revenue,
  );
});
