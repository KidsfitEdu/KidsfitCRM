'use client';

import { useState, type SyntheticEvent, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppBrand } from '@/components/common/app-brand';
import { Eye, EyeOff } from 'lucide-react';

// Dev-only demo convenience. Never embed a login password in production builds.
const developmentDemo = process.env.NODE_ENV === 'development';

export function LoginPage({
  loading,
  onLogin,
}: {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      await onLogin(formText(data, 'email'), formText(data, 'password'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại.');
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
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input
                name="email"
                type="email"
                defaultValue="admin@kidsfit.vn"
                required
                className="h-11 rounded-xl"
              />
            </Field>
            <div className="grid gap-1.5 text-sm font-medium">
              <label htmlFor="crm-login-password">Mật khẩu</label>
              <div className="relative">
                <Input
                  id="crm-login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  defaultValue={developmentDemo ? 'Kidsfit@2026' : ''}
                  autoComplete="current-password"
                  required
                  className="h-11 rounded-xl pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPassword(visible => !visible)}
                  className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5e20]"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
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


function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>;
}
function formText(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}
