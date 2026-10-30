'use client';
import type { ReactNode } from 'react';
/** Single structural wrapper used for all CRM role pages. */
export function AppShell({children}:{children:ReactNode}) {
  return <main className="min-h-screen bg-background text-foreground">{children}</main>;
}
