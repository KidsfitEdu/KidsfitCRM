'use client';
import type { ReactNode } from 'react';
/** The existing shell classes remain unchanged to avoid presentation drift. */
export function AppShell({sidebar,header,children}:{sidebar:ReactNode;header:ReactNode;children:ReactNode}) {
return <main className="min-h-screen bg-background text-foreground">
 {sidebar}
 <div className="pb-20 lg:pl-[248px] lg:pb-0">{header}{children}</div>
</main>;
}
