import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = file => readFileSync(resolve(import.meta.dirname, '..', file), 'utf8');
const menu = read('src/components/layout/UserProfileMenu.tsx');
const endpoints = read('../backend/src/KidsfitCRM.Api/Routing/ApiEndpoints.cs');
const auth = read('../backend/src/KidsfitCRM.Api/Features/Auth/AuthFeatures.cs');
const program = read('../backend/src/KidsfitCRM.Api/Program.cs');

test('authenticated password change has user-only route and throttling',()=>{
  assert.match(endpoints,/secured\.MapPost\("\/me\/change-password", AuthFeatures.ChangeOwnPassword\)\.RequireRateLimiting\("password-change"\)/);
  assert.match(program,/AddPolicy\("password-change"/);
  assert.match(program,/PermitLimit = 5, Window = TimeSpan.FromMinutes\(15\)/);
  assert.match(auth,/http.UserId\(\)/);
  assert.match(auth,/VerifyHashedPassword\(user, user.Password, request.CurrentPassword\)/);
  assert.match(auth,/next != request.ConfirmPassword/);
  assert.match(auth,/HashPassword\(user, next\)/);
  assert.match(auth,/user.SecurityStamp = Guid.NewGuid\(\).ToString\("N"\)/);
  assert.match(auth,/db.PasswordResetChallenges/);
});

test('password change form validates and logs out after confirmed success',()=>{
  for(const label of ['Đổi mật khẩu','Mật khẩu hiện tại','Mật khẩu mới','Xác nhận mật khẩu mới','Cập nhật mật khẩu']) assert.ok(menu.includes(label));
  assert.match(menu,/type=\{passwordVisibility\[field.id\] \? 'text' : 'password'\}/);
  assert.match(menu,/\<EyeOff aria-hidden="true"/);
  assert.match(menu,/\<Eye aria-hidden="true"/);
  assert.match(menu,/aria-pressed=\{Boolean\(passwordVisibility\[field.id\]\)\}/);
  assert.match(menu,/aria-label=\{passwordVisibility\[field.id\]/);
  assert.match(menu,/className="absolute inset-y-0 right-1/);
  assert.match(menu,/setPasswordFieldErrors\(errors\)/);
  assert.match(menu,/if \(!currentPassword\)/);
  assert.match(menu,/newPassword === currentPassword/);
  assert.match(menu,/error.status === 429/);
  assert.match(menu,/autoComplete=\{field.auto\}/);
  assert.match(menu,/newPassword.length < 12/);
  assert.match(menu,/newPassword !== confirmPassword/);
  assert.match(menu,/role="alert"/);
  assert.match(menu,/createApiClient\(apiBase\)\('\/me\/change-password', token/);
  assert.match(menu,/method: 'POST'/);
  assert.match(menu,/if \(!changed\) return;/);
  assert.match(menu,/await onLogout\(\)/);
  assert.match(menu,/if \(savingPassword\) return;/);
  assert.doesNotMatch(menu,/console\.log\(.*Password/);
});

test('password change request matches backend snake_case JSON contract',()=>{
  assert.match(program,/PropertyNamingPolicy = JsonNamingPolicy\.SnakeCaseLower/);
  assert.match(menu,/current_password: currentPassword/);
  assert.match(menu,/new_password: newPassword/);
  assert.match(menu,/confirm_password: confirmPassword/);
  assert.doesNotMatch(menu,/JSON\.stringify\(\{ currentPassword, newPassword, confirmPassword \}\)/);
  assert.match(auth,/ChangeOwnPasswordRequest\(string\? CurrentPassword, string\? NewPassword, string\? ConfirmPassword\)/);
});
