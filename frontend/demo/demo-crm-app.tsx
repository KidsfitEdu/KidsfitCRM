'use client';
import { DemoAccess } from '@/components/crm/demo-access';
import { CrmWorkspace } from '@/components/crm/crm-app';
import { demoChannelSalesWorkspace } from './channel-sales-fixture';
import { presentDemoWorkspace } from '@/lib/demo-auth';

/** Explicit static-only entrypoint; never imported by the live CRM route. */
export function DemoCrmApp() {
  return <DemoAccess>{(account, logout) =>
    <CrmWorkspace key={account.id} demoAccount={account} onDemoLogout={logout}
      initialWorkspace={presentDemoWorkspace(demoChannelSalesWorkspace, account)} />
  }</DemoAccess>;
}
