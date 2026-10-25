'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Check, FlaskConical, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  authenticateDemo,
  demoAccounts,
  demoLoginEmail,
  DEMO_PASSWORD,
  readDemoSession,
  saveDemoSession,
  type DemoAccount,
} from '@/lib/demo-auth';

const schema = z.object({
  email: z.email('Vui lòng nhập email hợp lệ.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
});

// This entry only renders when the real API is disabled. It never issues a JWT.
export function DemoAccess({
  children,
}: {
  children: (account: DemoAccount, logout: () => void) => ReactNode;
}) {
  const [account, setAccount] = useState<DemoAccount | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setAccount(readDemoSession(window.sessionStorage));
    } catch {
      /* Disabled storage. */
    }
    setReady(true);
  }, []);
  const updateSession = (next: DemoAccount | null) => {
    try {
      saveDemoSession(window.sessionStorage, next);
    } catch {
      /* In-memory only. */
    }
    setAccount(next);
  };
  if (!ready)
    return (
      <output className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Đang mở không gian làm việc…
      </output>
    );
  if (account) return children(account, () => updateSession(null));
  return <DemoLogin onLogin={updateSession} />;
}

function DemoLogin({ onLogin }: { onLogin: (account: DemoAccount) => void }) {
  const [selected, setSelected] = useState(demoAccounts[0]);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: demoLoginEmail(selected), password: DEMO_PASSWORD },
  });
  const choose = (account: DemoAccount) => {
    setSelected(account);
    form.reset({ email: demoLoginEmail(account), password: DEMO_PASSWORD });
  };
  const submit = form.handleSubmit((values) => {
    const account = authenticateDemo(values.email, values.password);
    if (!account) {
      form.setError('root', {
        message:
          'Email hoặc mật khẩu không đúng. Chọn một vai trò bên cạnh để điền lại.',
      });
      return;
    }
    onLogin(account);
  });
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#101a2b] px-5 py-8 text-white sm:p-10 lg:grid lg:place-items-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 size-[36rem] rounded-full bg-[#6558d3]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-60 right-0 size-[40rem] rounded-full bg-[#35b79b]/10 blur-3xl"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <section className="min-w-0">
          <div className="mb-9 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#8d7cf6] shadow-lg shadow-violet-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">Kidsfit CRM</p>
              <p className="text-xs text-slate-400">Giáo dục & CHECKEE</p>
            </div>
            <span className="ml-auto rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-medium text-violet-200">
              CRM Workspace
            </span>
          </div>
          <h1 className="max-w-lg text-3xl font-semibold leading-tight tracking-[-.045em] sm:text-4xl">
            Một không gian.
            <br />
            <span className="text-[#b7adff]">Nhiều góc nhìn.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            Chọn vai trò để trải nghiệm CRM với dữ liệu mẫu. Menu và thao tác
            được mô phỏng theo quyền của từng tài khoản.
          </p>
          <fieldset className="mt-7">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              01 · Chọn vai trò trải nghiệm
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  aria-pressed={selected.id === account.id}
                  onClick={() => choose(account)}
                  className={`flex min-h-16 items-center justify-between gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 ${selected.id === account.id ? 'border-[#a99df8] bg-[#8d7cf6]/20 text-white' : 'border-white/10 bg-white/[.035] text-slate-300 hover:border-white/25 hover:bg-white/8'}`}
                >
                  {account.roleLabel}
                  {selected.id === account.id && (
                    <Check className="size-4 shrink-0 text-violet-200" />
                  )}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Các màn hình nhập liệu, đối soát và chi trả nâng cao cần API thật;
            không được bật đầy đủ trong bản minh họa này.
          </p>
        </section>
        <section
          aria-label="Đăng nhập"
          className="self-center rounded-[28px] border border-white/10 bg-white p-6 text-[#172238] shadow-2xl sm:p-9"
        >
          <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#7768d9]">
            <FlaskConical className="size-4" />
            02 · Đăng nhập giả lập
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Chào mừng anh đến với Kidsfit CRM
          </h2>
          <p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">
            {selected.description}
          </p>
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="demo-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="demo-email"
                type="email"
                autoComplete="off"
                spellCheck={false}
                {...form.register('email', {
                  onChange: () => form.clearErrors('root'),
                })}
                aria-invalid={!!form.formState.errors.email}
                aria-describedby={
                  form.formState.errors.email ? 'demo-email-error' : undefined
                }
                className="h-12 rounded-xl border-slate-200 bg-slate-50 text-[#172238]"
              />
              {form.formState.errors.email && (
                <p
                  id="demo-email-error"
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="demo-password" className="text-sm font-medium">
                Mật khẩu
              </label>
              <Input
                id="demo-password"
                type="password"
                autoComplete="off"
                {...form.register('password', {
                  onChange: () => form.clearErrors('root'),
                })}
                aria-invalid={!!form.formState.errors.password}
                aria-describedby="demo-password-help demo-password-error"
                className="h-12 rounded-xl border-slate-200 bg-slate-50 text-[#172238]"
              />
              <p id="demo-password-help" className="text-xs text-slate-500">
                Thông tin đăng nhập đã được điền sẵn theo vai trò.
              </p>
              <p
                id="demo-password-error"
                role={form.formState.errors.password ? 'alert' : undefined}
                className="text-sm text-red-700"
              >
                {form.formState.errors.password?.message}
              </p>
            </div>
            {form.formState.errors.root && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {form.formState.errors.root.message}
              </p>
            )}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="h-12 w-full rounded-xl bg-[#6558d3] text-white shadow-lg shadow-violet-500/15 hover:bg-[#594cc8]"
            >
              {form.formState.isSubmitting
                ? 'Đang mở không gian làm việc…'
                : 'Đăng nhập'}
              <ArrowRight className="size-4" />
            </Button>
          </form>
          <aside className="mt-6 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Chỉ mô phỏng trên trình duyệt, không phải xác thực thật. Không nhập
            mật khẩu hệ thống hay thông tin khách hàng thật. Thay đổi thử không
            được lưu lên máy chủ.
          </aside>
        </section>
      </div>
    </main>
  );
}
