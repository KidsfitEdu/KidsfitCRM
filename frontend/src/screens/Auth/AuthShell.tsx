import type { ReactNode } from 'react';
import { AppBrand } from '@/components/common/app-brand';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  headerAction?: ReactNode;
};

export function AuthShell({ title, description, children, headerAction }: AuthShellProps) {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0e2a1a] p-4 py-10 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-[#81c784]/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-[#4caf50]/15 blur-3xl" />
      <Card className="relative w-full max-w-md rounded-3xl border-border/40 bg-card p-3 shadow-[0_28px_90px_rgba(0,0,0,.24)] sm:p-5">
        <CardHeader>
          <div className="mb-5 flex items-center justify-between gap-3">
            <AppBrand />
            {headerAction}
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
