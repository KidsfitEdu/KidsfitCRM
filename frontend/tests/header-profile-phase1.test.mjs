import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = file => readFileSync(resolve(import.meta.dirname, '..', file), 'utf8');
const menu = read('src/components/layout/UserProfileMenu.tsx');
const header = read('src/components/layout/Header.tsx');
const app = read('src/components/crm/crm-app.tsx');
const auth = read('../backend/src/KidsfitCRM.Api/Features/AuthFeatures.cs');

test('header avatar opens a keyboard-accessible menu with read-only personal drawer', () => {
  assert.match(header, /<UserProfileMenu user=\{profile\} dark=\{dark\} setDark=\{setDark\} onLogout=\{onLogout\} isAdmin=\{isAdmin\}[\s\S]{0,160}apiBase=\{apiBase\} token=\{token\} avatarUrl=\{avatarUrl\} onAvatarChanged=\{onAvatarChanged\}/);
  assert.match(menu, /aria-label="Mở menu tài khoản"/);
  assert.match(menu, /<PopoverTrigger render=/);
  assert.match(menu, /<AppDrawer open=\{profileOpen\} onOpenChange=\{open => \{if\(!open\)requestProfileCancel\(true\);\}\} title="Hồ sơ cá nhân"/);
  assert.match(menu, /setMenuOpen\(false\);setProfileOpen\(true\)/);
  for (const label of ['Họ và tên','Số điện thoại','Email','Mã nhân sự','Tổ chức','Vai trò']) {
    assert.ok(menu.includes(label), 'Profile detail missing: '+label);
  }
  assert.match(menu, /bodyClassName="space-y-4 bg-muted\/10"/);
  assert.match(menu, /type="file"/);
  assert.match(menu, /\/me\/avatar/);
  assert.doesNotMatch(menu, /\/profile\/update/);
});

test('profile only reflects authenticated /me data and does not allow role editing', () => {
  assert.match(auth, /user.Id, user.Code, user.Name, user.Email, user.Phone/);
  assert.match(auth, /organization_name = primary\?\.organization_name/);
  assert.match(auth, /membership_type = primary\?\.membership_type/);
  assert.match(app, /request<\{ user: CurrentUserProfile & \{ abilities: string\[\] \} \}>\('\/me', accessToken\)/);
  assert.match(app, /setProfile\(\{id:me.user.id, code:me.user.code, name:me.user.name, email:me.user.email, phone:me.user.phone/);
  assert.match(menu, /membershipLabels: Record<string, string>/);
  assert.ok(menu.includes("createApiClient(apiBase)<{user:CurrentUserProfile}>('/me', token"));
  assert.match(menu, /method: 'PATCH'/);
  assert.doesNotMatch(menu, /\/users\/|\/profile\/update|method: 'PUT'/);
});

test('menu reuses theme switching and logout clears cached profile', () => {
  assert.match(menu, /setDark\(value => !value\)/);
  assert.match(menu, /aria-pressed=\{dark\}/);
  assert.match(menu, /void onLogout\(\)/);
  assert.match(app, /const logout = async \(\) => \{/);
  assert.match(app, /sessionStorage.removeItem\('kidsfit_token'\);\s*setProfile\(null\);/);
  assert.match(app, /window.sessionStorage.removeItem\('kidsfit_token'\);\s*setProfile\(null\);/);
  assert.match(app, /<Sidebar .* onLogout=\{logout\}/);
});

test('avatar menu is compact, horizontal and keeps a discoverable theme toggle', () => {
  assert.match(menu, /w-\[min\(92vw,288px\)\]/);
  assert.match(menu, /flex min-w-0 items-center gap-3 border-b/);
  assert.match(menu, /truncate text-sm font-bold/);
  assert.match(menu, /min-h-11 w-full/);
  assert.match(menu, /Giao diện tối/);
  assert.match(menu, /aria-pressed=\{dark\}/);
  assert.match(menu, /setDark\(value => !value\)/);
});
