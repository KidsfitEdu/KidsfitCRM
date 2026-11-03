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
    ['Quản trị viên',8],['Quản lý bán hàng',7],
    ['Nhân viên bán hàng',5],['CTV đối tác',5],
    ['Ban giám đốc',4],['Kế toán',2],
    ['Chăm sóc khách hàng',3],['CHECKEE',3],
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

test('CHECKEE has verification and technical support screens', async () => {
  const {context,page,navigation,errors} = await login('CHECKEE');
  assert.equal(await navigation.locator('button').count(),3);
  await navigation.getByRole('button',{name:'Xác minh hợp đồng',exact:true}).click();
  await page.getByRole('heading',{name:'Xác minh hợp đồng'}).waitFor();
  await page.getByRole('combobox',{name:'Lọc trạng thái xác minh'}).waitFor();
  await page.getByRole('navigation',{name:'Phân trang danh sách'}).waitFor();
  await navigation.getByRole('button',{name:'Hỗ trợ kỹ thuật',exact:true}).click();
  await page.getByRole('heading',{name:'Hỗ trợ kỹ thuật'}).waitFor();
  assert.deepEqual(errors,[]);
  await context.close();
});

test('Admin can navigate eight screens without browser exceptions', async () => {
  const {context,page,navigation,errors} = await login('Quản trị viên');
  for (let i=0;i<8;i+=1) {
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
  assert.equal(await nav.locator('button').count(),5);
  await nav.locator('button').nth(1).click();
  assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(artifacts,'collaborator-mobile.png')});
  await page.setViewportSize({width:1400,height:900});
  await page.getByRole('button',{name:'Đăng xuất'}).click();
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).waitFor();
  await context.close();
});

test('Sales desktop uses 30% flat underline tabs and a table for proposals', async () => {
  const {context,page,navigation,errors} = await login('Nhân viên bán hàng');
  await navigation.getByRole('button',{name:'Trường của tôi',exact:true}).click();
  const tabs = page.getByRole('navigation',{name:'Nhóm công việc Sales'});
  await tabs.waitFor();
  await page.getByRole('navigation',{name:'Phân trang danh sách'}).waitFor();
  assert.ok(await page.getByRole('combobox',{name:'Số dòng mỗi trang'}).isVisible());
  assert.ok(await page.getByRole('button',{name:'Trang 1'}).isVisible());
  const sizes = await tabs.evaluate(element => ({
    outer: element.getBoundingClientRect().width,
    inner: element.firstElementChild.getBoundingClientRect().width,
  }));
  assert.ok(sizes.inner / sizes.outer > 0.27 && sizes.inner / sizes.outer < 0.33,
    'Sales underline tab group should occupy about 30% of the content width');
  const style = await tabs.evaluate(element => {
    const tab = element.querySelector('button[aria-current="page"]');
    return {navBackground:getComputedStyle(element).backgroundColor,
      activeUnderline:getComputedStyle(tab).borderBottomColor,
      activeWidth:getComputedStyle(tab).borderBottomWidth};
  });
  assert.equal(style.navBackground, 'rgb(255, 255, 255)');
  assert.equal(style.activeUnderline, 'rgb(27, 94, 32)');
  assert.equal(style.activeWidth, '3px');
  await tabs.getByRole('button',{name:'Chờ nhận phân bổ'}).click();
  await page.getByRole('textbox',{name:'Tìm trường chờ phân bổ'}).waitFor();
  await page.getByRole('combobox',{name:'Lọc trạng thái phân bổ'}).waitFor();
  await page.getByRole('navigation',{name:'Phân trang danh sách'}).waitFor();
  // Sales now uses the five-entry menu; consultation and extension actions live
  // inside "Trường của tôi", so there is no separate activity sidebar entry.
  assert.equal(await tabs.getByRole('button',{name:'Gia hạn tiếp cận'}).count(),0);
  await navigation.getByRole('button',{name:'Đề xuất trường',exact:true}).click();
  await page.getByRole('table').waitFor();
  assert.ok(await page.getByRole('columnheader',{name:'Người đề xuất'}).isVisible());
  assert.ok(await page.getByRole('button',{name:'Đặt lại bộ lọc'}).isVisible());
  await page.getByRole('navigation',{name:'Phân trang danh sách'}).waitFor();
  assert.ok(await page.getByRole('combobox',{name:'Số dòng mỗi trang'}).isVisible());
  assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(artifacts,'sales-proposals-table.png')});
  await context.close();
});

test('Board navigation merges reports and keeps styled exception queues', async () => {
  const {context,page,navigation,errors} = await login('Ban giám đốc');
  assert.equal(await navigation.locator('button').count(),4);
  await navigation.getByRole('button',{name:'Hồ sơ quá hạn',exact:true}).click();
  await page.getByRole('textbox',{name:'Tìm hồ sơ quá hạn'}).waitFor();
  await page.getByRole('combobox',{name:'Lọc loại hồ sơ'}).waitFor();
  await page.getByRole('navigation',{name:'Phân trang danh sách'}).waitFor();
  await navigation.getByRole('button',{name:'Tranh chấp',exact:true}).click();
  await page.getByRole('textbox',{name:'Tìm tranh chấp'}).waitFor();
  await navigation.getByRole('button',{name:'Chính sách',exact:true}).click();
  await page.getByRole('textbox',{name:'Tìm chính sách'}).waitFor();
  assert.deepEqual(errors,[]);
  await context.close();
});
