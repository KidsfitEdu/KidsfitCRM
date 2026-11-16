'use client';

import { SalesIncomePage } from '@/components/roles/SalesIncomePage';
import type { ManagerPageProps } from '@/types/manager-pages';

/** Manager's own entitlement only, not the aggregate income of their Sales team. */
export function IncomePage({apiBase,token,abilities}:ManagerPageProps) {
  return <SalesIncomePage apiBase={apiBase} token={token} abilities={abilities} beneficiaryRole="MANAGER"/>;
}
