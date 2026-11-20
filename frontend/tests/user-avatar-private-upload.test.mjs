import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = path => readFileSync(resolve(import.meta.dirname, '..', path), 'utf8');
const menu = read('src/components/layout/UserProfileMenu.tsx');
const header = read('src/components/layout/Header.tsx');
const sidebar = read('src/components/layout/Sidebar.tsx');
const app = read('src/components/crm/crm-app.tsx');
const endpoint = read('../backend/src/KidsfitCRM.Api/Features/UserAvatarFeatures.cs');
const routes = read('../backend/src/KidsfitCRM.Api/Features/ApiEndpoints.cs');
const storage = read('../backend/src/KidsfitCRM.Api/Infrastructure/LocalFileStorageService.cs');

test('avatar API is authenticated, self-owned and never accepts caller-chosen identity/storage keys',()=>{
  assert.match(routes,/secured\.MapGet\("\/me\/avatar", UserAvatarFeatures.Download\)/);
  assert.match(routes,/secured\.MapPost\("\/me\/avatar", UserAvatarFeatures.Upload\)\.RequireRateLimiting\("avatar-upload"\)/);
  assert.match(routes,/secured\.MapDelete\("\/me\/avatar", UserAvatarFeatures.Remove\)/);
  assert.match(endpoint,/http.UserId\(\)/);
  assert.match(endpoint,/MaxAvatarBytes = 2L \* 1024 \* 1024/);
  assert.match(endpoint,/storage.SaveAsync\(input, "AVATAR", ct\)/);
  assert.match(endpoint,/Cache-Control/);
  assert.match(endpoint,/nosniff/);
  assert.match(storage,/\["AVATAR"\] = "avatars"/);
  assert.match(storage,/DetectMime\(signature\)/);
  assert.doesNotMatch(endpoint,/userId = form\[|storage_key = form\[/);
});

test('avatar UI uses bearer-protected image fetch and never exposes raw storage URL',()=>{
  assert.match(app,/fetch\(apiBase \+ '\/me\/avatar'/);
  assert.match(app,/Authorization: 'Bearer ' \+ token/);
  assert.match(app,/URL\.createObjectURL\(await response.blob\(\)\)/);
  assert.match(app,/URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(menu,/accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(menu,/file.size > 2 \* 1024 \* 1024/);
  assert.match(menu,/new FormData\(\)/);
  assert.match(menu,/method: 'POST'/);
  assert.match(menu,/method: 'DELETE'/);
  assert.match(menu,/onAvatarChanged\(\)/);
  assert.match(menu,/avatarUrl \? <img src=\{avatarUrl\}/);
  assert.match(sidebar,/avatarUrl \? <img src=\{avatarUrl\}/);
  assert.match(header,/avatarUrl=\{avatarUrl\} onAvatarChanged=\{onAvatarChanged\}/);
});
