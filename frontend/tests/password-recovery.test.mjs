import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const login = readFileSync(resolve(import.meta.dirname, '../src/screens/Auth/Login/LoginPage.tsx'), 'utf8');
const recovery = readFileSync(resolve(import.meta.dirname, '../src/screens/Auth/PasswordRecovery/PasswordRecoveryPage.tsx'), 'utf8');
const authShell = readFileSync(resolve(import.meta.dirname, '../src/screens/Auth/AuthShell.tsx'), 'utf8');

test('login exposes the password recovery flow without changing login submit', () => {
  assert.match(login, /<PasswordRecovery initialEmail=\{email\}/);
  assert.match(login, /Quên mật khẩu\?/);
  assert.match(login, /<form onSubmit=\{submit\} noValidate/);
});

test('password recovery uses the authenticated API boundary and three distinct actions', () => {
  assert.match(recovery, /'\/auth\/password\/forgot'/);
  assert.match(recovery, /'\/auth\/password\/verify-otp'/);
  assert.match(recovery, /'\/auth\/password\/reset'/);
  assert.match(recovery, /reset_token/);
  assert.match(recovery, /new_password/);
  assert.match(recovery, /confirm_password/);
  assert.match(recovery, /return \(/);
  assert.doesNotMatch(recovery, /sessionStorage\.setItem/);
  assert.doesNotMatch(recovery, /localStorage\.setItem/);
});

test('OTP is input-constrained and reset password is never shown in email', () => {
  assert.match(recovery, /autoComplete="one-time-code"/);
  assert.match(recovery, /inputMode="numeric"/);
  assert.match(recovery, /replace\(\/\\D\/g, ''\)/);
  assert.match(recovery, /minLength=\{12\}/);
  assert.match(recovery, /autoComplete="new-password"/);
  assert.match(recovery, /disabled=\{busy \|\| remaining > 0\}/);
});

test('login and recovery share the same branded visual shell', () => {
  assert.match(login, /<AuthShell title="Chào mừng trở lại"/);
  assert.match(recovery, /<AuthShell title=\{titles\[step\]\}/);
  assert.match(authShell, /<AppBrand \/>/);
  assert.match(authShell, /bg-\[#101a2b\]/);
  assert.match(authShell, /max-w-md/);
  assert.doesNotMatch(recovery, /bg-\[#f3f8f3\]/);
});
