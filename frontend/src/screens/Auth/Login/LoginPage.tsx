'use client';

import { useState, type SyntheticEvent, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppBrand } from '@/components/common/app-brand';

export function LoginPage({
  loading,
  onLogin,
}: {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [error, setError] = useState('');
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
            Đăng nhập để truy cập workspace MySQL.
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
            <Field label="Mật khẩu">
              <Input
                name="password"
                type="password"
                required
                className="h-11 rounded-xl"
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-primary hover:bg-[#594cc8]"
            >
              {loading ? 'Đang kết nối…' : 'Đăng nhập'}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Nhập mật khẩu được cấu hình riêng cho tài khoản demo trong môi trường backend.
          </p>
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
