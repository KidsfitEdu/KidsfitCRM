'use client';

import { useRef, useState, type SyntheticEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppBrand } from '@/components/common/app-brand';
import { FormError } from '@/components/common/form-error';
import { Eye, EyeOff } from 'lucide-react';
import { validateLogin, type LoginErrors, type LoginField } from '@/lib/login-validation';

export function LoginPage({
  loading,
  onLogin,
}: {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const validateField = (field: LoginField, nextEmail = email, nextPassword = password) => {
    const error = validateLogin(nextEmail, nextPassword)[field];
    setErrors(previous => ({ ...previous, [field]: error }));
  };

  const updateField = (field: LoginField, value: string) => {
    setServerError('');
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
    try {
      await onLogin(email.trim().toLowerCase(), password);
    } catch (cause) {
      setServerError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#101a2b] p-5">
      <div className="absolute -left-32 -top-32 size-96 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-[#35b79b]/20 blur-3xl" />
      <Card className="relative w-full max-w-md border-white/10 bg-white/[.96] p-3 shadow-2xl dark:bg-[#1b2940]">
        <CardHeader>
          <div className="mb-5 flex items-center gap-3">
            <AppBrand />
          </div>
          <CardTitle className="text-2xl">Chào mừng trở lại</CardTitle>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để quản lý và theo dõi hoạt động KIDSFIT CRM.
          </p>
        </CardHeader>
        <CardContent>
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
            {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#1b5e20] font-semibold text-white hover:bg-[#124c17] hover:text-white focus-visible:ring-[#1b5e20]"
            >
              {loading ? 'Đang kết nối…' : 'Đăng nhập'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
