import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const login = readFileSync(resolve(import.meta.dirname, '../src/screens/Auth/Login/LoginPage.tsx'), 'utf8');
const recovery = readFileSync(resolve(import.meta.dirname, '../src/screens/Auth/PasswordRecovery/PasswordRecoveryPage.tsx'), 'utf8');
const authShell = readFileSync(resolve(import.meta.dirname, '../src/screens/Auth/AuthShell.tsx'), 'utf8');
const appLayout = readFileSync(resolve(import.meta.dirname, '../src/app/layout.tsx'), 'utf8');
const toastProvider = readFileSync(resolve(import.meta.dirname, '../src/components/common/app-toast-provider.tsx'), 'utf8');

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
  assert.match(recovery, /autoComplete=\{index === 0 \? 'one-time-code' : 'off'\}/);
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

test('OTP page remains compact, six-digit and supports paste and keyboard', () => {
  assert.match(recovery, /grid grid-cols-6 gap-2/);
  assert.match(recovery, /Array.from\(\{ length: 6 \}/);
  assert.match(recovery, /onPaste=\{/);
  assert.match(recovery, /onKeyDown=\{/);
  assert.match(recovery, /Gửi lại sau /);
  assert.doesNotMatch(recovery, /<output className="block rounded-lg bg-\[#edf7ed\]/);
});

test('successful reset returns directly to login with visible confirmation', () => {
  assert.match(login, /onSuccess=\{\(\) => \{/);
  assert.match(login, /appNotice\.success\('Đặt lại mật khẩu thành công', 'Vui lòng đăng nhập bằng mật khẩu mới\.'\)/);
  assert.doesNotMatch(login, /resetSuccess/);
  assert.doesNotMatch(login, /<output className="block rounded-xl border border-green-200/);
  assert.match(recovery, /onSuccess\(\);/);
  assert.doesNotMatch(recovery, /setStep\('done'\)/);
});

test('global toast provider covers unauthenticated Login route', () => {
  assert.match(appLayout, /<AppToastProvider>\{children\}<\/AppToastProvider>/);
  assert.match(toastProvider, /success\(title: string, description\?: string\)/);
  assert.match(login, /import \{ appNotice \} from '@\/components\/common\/app-toast-provider'/);
});

test('recovery header has accessible back icon while login has no back action', () => {
  assert.match(authShell, /headerAction\?: ReactNode/);
  assert.match(authShell, /\{headerAction\}/);
  assert.match(recovery, /headerAction=\{/);
  assert.match(recovery, /aria-label="Quay lại đăng nhập"/);
  assert.match(recovery, /<ArrowLeft aria-hidden="true"/);
  assert.match(recovery, /onClick=\{onClose\} disabled=\{busy\}/);
  assert.doesNotMatch(recovery, /mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2/);
  assert.doesNotMatch(login, /headerAction=/);
});

test('resend retains entered OTP and only clears state on initial request', () => {
  assert.match(recovery, /const isResend = step === 'otp';/);
  assert.match(recovery, /if \(!isResend\) \{/);
  assert.match(recovery, /setOtp\(''\); setTicket\(''\);/);
  assert.match(recovery, /if \(isResend\) appNotice\.warning/);
  assert.match(recovery, /appNotice\.info\('Đã tiếp nhận yêu cầu gửi lại mã'/);
  assert.match(recovery, /remaining > 0 \|\| resendAfter > Date\.now\(\)/);
  const resendBranch = recovery.slice(recovery.indexOf('const send = async'), recovery.indexOf('const verify = async'));
  const catchBlock = resendBranch.slice(resendBranch.indexOf('} catch (cause)'));
  assert.doesNotMatch(catchBlock, /setResendAfter/);
  assert.doesNotMatch(catchBlock, /setOtp/);
});

test('resend does not promise that a 200 response proves Gmail delivered an email', () => {
  assert.match(recovery, /Nếu tài khoản đủ điều kiện, hãy kiểm tra hộp thư và thư rác\./);
  assert.doesNotMatch(recovery, /Gửi lại mã thành công/);
});
