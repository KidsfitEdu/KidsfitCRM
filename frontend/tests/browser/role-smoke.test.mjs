import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { chromium } from '@playwright/test';

// Run against the built Vite demo, not against production API/data.
const url = 'http://127.0.0.1:4173/KidsfitCRM/';
const artifacts = resolve('tests/browser/screenshots');
let preview;
let browser;

before(async () => {
  await mkdir(artifacts, { recursive: true });
  preview = spawn('npm', ['run','preview:pages','--','--host','127.0.0.1','--port','4173'], {
    stdio: 'ignore',
  });
  let ready = false;
  for (let i = 0; i < 80; i += 1) {
    try {
      if ((await fetch(url)).ok) { ready = true; break; }
    } catch { /* Preview not listening yet. */ }
    await new Promise(r => setTimeout(r, 500));
  }
  assert.ok(ready, 'Vite preview must be reachable');
  browser = await chromium.launch({headless:true});
});
after(async () => {
  await browser?.close();
  preview?.kill();
});

async function login(profileLabel, viewport={width:1400,height:900}) {
  const context = await browser.newContext({viewport});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.getByRole('button',{name:profileLabel,exact:true}).click();
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  const navigation = page.getByRole('navigation',{name:viewport.width < 1024 ? 'Điều hướng di động' : 'Điều hướng chính'});
  await navigation.locator('button').first().waitFor();
  return {context,page,navigation,errors};
}

test('seven CRM roles across eight demo accounts can log in and open their menu', async () => {
  const roles = [
    ['Quản trị viên',7],['Quản lý bán hàng',6],
    ['Nhân viên bán hàng',6],['CTV đối tác',6],
    ['Ban giám đốc',5],['Kế toán',5],
    ['Chăm sóc khách hàng',5],['CHECKEE',5],
  ];
  for (const [name,expected] of roles) {
    const {context,page,navigation,errors} = await login(name);
    assert.equal(await navigation.locator('button').count(),expected,name);
    await navigation.locator('button').last().click();
    await page.waitForTimeout(200);
    assert.deepEqual(errors,[],name+' browser errors');
    await page.screenshot({path:resolve(artifacts,name.replaceAll(' ','-')+'.png')});
    await context.close();
  }
});

test('Admin can navigate seven screens without browser exceptions', async () => {
  const {context,page,navigation,errors} = await login('Quản trị viên');
  for (let i=0;i<7;i+=1) {
    await navigation.locator('button').nth(i).click();
    await page.waitForTimeout(180);
    assert.ok((await page.locator('body').innerText()).length>200,'Empty Admin screen '+i);
    assert.deepEqual(errors,[],'Browser exception on Admin screen '+i);
  }
  await context.close();
});

test('Collaborator mobile navigation and logout work', async () => {
  const {context,page,errors} = await login('CTV đối tác',{width:390,height:844});
  const nav = page.getByRole('navigation',{name:'Điều hướng di động'});
  assert.equal(await nav.locator('button').count(),6);
  await nav.locator('button').nth(1).click();
  assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(artifacts,'collaborator-mobile.png')});
  await page.setViewportSize({width:1400,height:900});
  await page.getByRole('button',{name:'Đăng xuất'}).click();
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).waitFor();
  await context.close();
});

test('Sales desktop uses half-width left tabs and a table for proposals', async () => {
  const {context,page,navigation,errors} = await login('Nhân viên bán hàng');
  await navigation.getByRole('button',{name:'Trường của tôi',exact:true}).click();
  const tabs = page.getByRole('navigation',{name:'Nhóm công việc Sales'});
  await tabs.waitFor();
  const sizes = await tabs.evaluate(element => ({
    outer: element.getBoundingClientRect().width,
    inner: element.firstElementChild.getBoundingClientRect().width,
  }));
  assert.ok(sizes.inner / sizes.outer > 0.45 && sizes.inner / sizes.outer < 0.55,
    'Sales tabs should occupy about half the available table width');
  await tabs.getByRole('button',{name:'Chờ nhận phân bổ'}).click();
  await navigation.getByRole('button',{name:'Tiếp cận & tư vấn',exact:true}).click();
  await page.getByRole('navigation',{name:'Nhóm công việc Sales'})
    .getByRole('button',{name:'Gia hạn tiếp cận'}).click();
  await navigation.getByRole('button',{name:'Đề xuất trường',exact:true}).click();
  await page.getByRole('table').waitFor();
  assert.ok(await page.getByRole('columnheader',{name:'Người đề xuất'}).isVisible());
  assert.ok(await page.getByRole('button',{name:'Đặt lại bộ lọc'}).isVisible());
  assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(artifacts,'sales-proposals-table.png')});
  await context.close();
});
