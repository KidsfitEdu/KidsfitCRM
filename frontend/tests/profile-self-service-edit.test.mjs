import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');
const menu = read('src/components/layout/UserProfileMenu.tsx');
const app = read('src/components/crm/crm-app.tsx');
const header = read('src/components/layout/Header.tsx');
const auth = read('../backend/src/KidsfitCRM.Api/Features/Auth/AuthFeatures.cs');
const routes = read('../backend/src/KidsfitCRM.Api/Features/ApiEndpoints.cs');

test('self-service endpoint updates only authenticated name/phone and records changes', () => {
  assert.match(routes, /secured\.MapPatch\("\/me", AuthFeatures.UpdateOwnProfile\)/);
  assert.match(auth, /actorId = http\.UserId\(\)/);
  assert.match(auth, /SELECT \* FROM users WHERE id = \{actorId\} FOR UPDATE/);
  assert.match(auth, /Validation.Required\(request.Name, "name"/);
  assert.match(auth, /phone\?\.Length > 40/);
  assert.match(auth, /if \(user.Name != name \|\| user.Phone != phone\)/);
  assert.match(auth, /Audit.Add\(db, actorId, "UPDATE_OWN_PROFILE"/);
  assert.match(auth, /UserPayloadWithOrganization\(db, user/);
  assert.doesNotMatch(auth.split('public static async Task<IResult> UpdateOwnProfile')[1].split('public static async Task<IResult> ChangeOwnPassword')[0], /user\.(Email|Status|SecurityStamp|Password|Code)\s*=/);
});

test('personal data edit has input validation, accessible labels, draft protection and request lifecycle', () => {
  assert.match(menu, /id="profile-edit-name"/);
  assert.match(menu, /id="profile-edit-phone"/);
  assert.match(menu, /type="tel" inputMode="tel"/);
  assert.match(menu, /form="profile-self-edit-form"/);
  assert.match(menu, /profileDirty/);
  assert.match(menu, /<ConfirmDialog open=\{discardPrompt\}/);
  assert.match(menu, /Lưu thay đổi/);
  assert.match(menu, /role="alert"/);
  assert.match(menu, /createApiClient\(apiBase\)<\{user:CurrentUserProfile\}>\('\/me', token/);
  assert.match(menu, /method: 'PATCH'/);
  assert.match(menu, /onProfileUpdated\(response.user\)/);
  assert.match(menu, /appNotice.success\('Cập nhật hồ sơ thành công.'\)/);
  assert.match(menu, /setProfileError\(error instanceof Error/);
});

test('saved profile propagates to header and sidebar without editing org or RBAC', () => {
  assert.match(header, /onProfileUpdated=\{onProfileUpdated\}/);
  assert.match(app, /setProfile\(next\);\s*setUserName\(next.name\);/);
  assert.match(app, /onProfileUpdated=\{onProfileUpdated\}/);
  assert.doesNotMatch(menu, /<Input[^>]+id="profile-edit-(email|role|organization)"/);
});
