import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { validateLogin } from '../src/lib/login-validation.ts';

const loginSource = readFileSync(resolve(import.meta.dirname, '../src/screens/Auth/Login/LoginPage.tsx'), 'utf8');

test('Login validation reports Vietnamese field errors', () => {
  assert.deepEqual(validateLogin('', ''), {
    email: 'Vui lòng nhập địa chỉ email.',
    password: 'Vui lòng nhập mật khẩu.',
  });
  assert.deepEqual(validateLogin('missing-at-sign', 'a'), {
    email: 'Địa chỉ email không đúng định dạng.',
  });
  assert.deepEqual(validateLogin(' admin@kidsfit.vn ', 'secret'), {});
  assert.deepEqual(validateLogin('admin@kidsfit.vn', ''), {
    password: 'Vui lòng nhập mật khẩu.',
  });
  assert.deepEqual(validateLogin('a'.repeat(191) + '@test.com', 'secret'), {
    email: 'Địa chỉ email không đúng định dạng.',
  });
});

test('Login form uses custom validation, removes autofilled credentials, and preserves browser password manager support', () => {
  assert.match(loginSource, /<form onSubmit=\{submit\} noValidate/);
  assert.match(loginSource, /validateLogin\(email, password\)/);
  assert.match(loginSource, /if \(Object\.keys\(nextErrors\)\.length > 0\)/);
  assert.match(loginSource, /emailRef\.current\?\.focus\(\)/);
  assert.match(loginSource, /passwordRef\.current\?\.focus\(\)/);
  assert.match(loginSource, /aria-describedby=\{errors\.email/);
  assert.match(loginSource, /aria-describedby=\{errors\.password/);
  assert.match(loginSource, /onBlur=\{\(\) => validateField\('email'\)\}/);
  assert.match(loginSource, /onBlur=\{\(\) => validateField\('password'\)\}/);
  assert.match(loginSource, /autoComplete="current-password"/);
  assert.doesNotMatch(loginSource, /defaultValue=/);
  assert.doesNotMatch(loginSource, /Kidsfit@2026|developmentDemo/);
});

test('Login displays server error separately and keeps loading guard and visibility toggle', () => {
  assert.match(loginSource, /if \(loading\) return;/);
  assert.match(loginSource, /setServerError\(''\)/);
  assert.match(loginSource, /setServerError\(cause instanceof Error/);
  assert.match(loginSource, /serverError && <p role="alert"/);
  assert.match(loginSource, /aria-pressed=\{showPassword\}/);
});
