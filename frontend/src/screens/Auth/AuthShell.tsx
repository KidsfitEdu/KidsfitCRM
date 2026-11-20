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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#101a2b] p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-[#35b79b]/20 blur-3xl" />
      <Card className="relative w-full max-w-md border-white/10 bg-white/[.96] p-3 shadow-2xl dark:bg-[#1b2940]">
        <CardHeader>
          <div className="mb-5 flex items-center justify-between gap-3">
            <AppBrand />
            {headerAction}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
