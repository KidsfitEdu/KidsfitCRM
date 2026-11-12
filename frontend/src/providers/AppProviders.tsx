'use client';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalLoadingProvider } from '@/components/common/app-loading';

/** One query cache per mounted authenticated CRM workspace, never global between demo profiles. */
export function AppProviders({children}:{children:ReactNode}) {
 const [client]=useState(()=>new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000}}}));
 return <QueryClientProvider client={client}><GlobalLoadingProvider>{children}</GlobalLoadingProvider></QueryClientProvider>;
}
