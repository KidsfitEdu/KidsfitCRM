'use client';

import { useRef, useState, type SyntheticEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormError } from '@/components/common/form-error';
import { Eye, EyeOff } from 'lucide-react';
import { validateLogin, type LoginErrors, type LoginField } from '@/lib/login-validation';
import { ApiRequestError, isBackendUnavailable } from '@/services/api.client';
import { PageLoading, AppRequestErrorState } from '@/components/common/app-loading';
import { PasswordRecovery } from '@/screens/Auth/PasswordRecovery/PasswordRecoveryPage';
import { AuthShell } from '@/screens/Auth/AuthShell';

export function LoginPage({
  loading,
  onLogin,
}: {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState('');
  const [connectionIssue, setConnectionIssue] = useState<'offline' | 'error' | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const validateField = (field: LoginField, nextEmail = email, nextPassword = password) => {
    const error = validateLogin(nextEmail, nextPassword)[field];
    setErrors(previous => ({ ...previous, [field]: error }));
  };

  const updateField = (field: LoginField, value: string) => {
    setServerError('');
    setResetSuccess(false);
    const nextEmail = field === 'email' ? value : email;
    const nextPassword = field === 'password' ? value : password;
    if (field === 'email') setEmail(value);
    else setPassword(value);
    if (errors[field]) validateField(field, nextEmail, nextPassword);
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setServerError('');
    const nextErrors = validateLogin(email, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    await attemptLogin();
  };

  const attemptLogin = async () => {
    if (retrying || loading) return;
    setRetrying(true);
    setConnectionIssue(null);
    try {
      await onLogin(email.trim().toLowerCase(), password);
    } catch (cause) {
      if (isBackendUnavailable(cause)) {
        setConnectionIssue(cause instanceof ApiRequestError && cause.kind === 'http' ? 'error' : 'offline');
        return;
      }
      setServerError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally { setRetrying(false); }
  };

  if (recovering) return <PasswordRecovery initialEmail={email} onClose={() => setRecovering(false)}
    onSuccess={() => { setRecovering(false); setPassword(''); setErrors({}); setServerError(''); setResetSuccess(true); }} />;

  if (loading || retrying)
    return <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-7"><PageLoading label="Đang kết nối và xác thực tài khoản..."/></main>;

  if (connectionIssue)
    return <div>
      <AppRequestErrorState fullScreen title="Không thể kết nối máy chủ"
        detail="Không thể kết nối máy chủ KIDSFIT CRM để đăng nhập. Vui lòng thử lại."
        onRetry={() => { void attemptLogin(); }}/>
      <button type="button" onClick={() => { setConnectionIssue(null); setServerError(''); }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl border border-border bg-card px-5 py-2 text-sm text-foreground hover:bg-muted">
        Quay lại đăng nhập
      </button>
    </div>;

  return (
    <AuthShell title="Chào mừng trở lại" description="Đăng nhập để quản lý và theo dõi hoạt động KIDSFIT CRM.">
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid gap-1.5 text-sm font-medium">
              <label htmlFor="crm-login-email">Email</label>
              <Input
                id="crm-login-email"
                ref={emailRef}
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={event => updateField('email', event.target.value)}
                onBlur={() => validateField('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'crm-login-email-error' : undefined}
                placeholder="Nhập địa chỉ email"
                maxLength={190}
                required
                disabled={loading}
                className="h-11 rounded-xl"
              />
              <FormError id="crm-login-email-error">{errors.email}</FormError>
            </div>
            <div className="grid gap-1.5 text-sm font-medium">
              <label htmlFor="crm-login-password">Mật khẩu</label>
              <div className="relative">
                <Input
                  id="crm-login-password"
                  ref={passwordRef}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={event => updateField('password', event.target.value)}
                  onBlur={() => validateField('password')}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'crm-login-password-error' : undefined}
                  placeholder="Nhập mật khẩu"
                  required
                  disabled={loading}
                  className="h-11 rounded-xl pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  disabled={loading}
                  onClick={() => setShowPassword(visible => !visible)}
                  className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5e20]"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
              <FormError id="crm-login-password-error">{errors.password}</FormError>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => { setServerError(''); setRecovering(true); }}
                className="rounded-md px-1 py-1 text-sm font-medium text-[#1b5e20] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5e20] dark:text-[#96d8a1]">
                Quên mật khẩu?
              </button>
            </div>
            {resetSuccess && <output className="block rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.</output>}
            {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#1b5e20] font-semibold text-white hover:bg-[#124c17] hover:text-white focus-visible:ring-[#1b5e20]"
            >
              {loading ? 'Đang kết nối…' : 'Đăng nhập'}
            </Button>
          </form>
    </AuthShell>
  );
}
