'use client';

import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/AppShell';
import { AppProviders } from '@/providers/AppProviders';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LoginPage } from '@/screens/Auth/Login/LoginPage';
import { DemoAccess } from '@/components/crm/demo-access';
import { ChannelSalesView } from '@/components/crm/channel-sales-view';
import { nav, type View } from '@/config/navigation';
import { viewToPath, pathToView } from '@/config/routes';
import { createApiClient } from '@/services/api.client';
import { demoChannelSalesWorkspace, type ChannelCustomer, type ChannelSalesWorkspace, type CustomerActivityInput, type RegisterApproachInput, type ReportContractInput, type RevenueReceiptInput } from '@/lib/channel-sales';
import { presentDemoWorkspace, type DemoAccount } from '@/lib/demo-auth';

const apiBase = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? '' : (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '');
const request = createApiClient(apiBase);
const AdminWorkspace = lazy(() => import('@/screens/Admin/AdminWorkspace').then(m => ({ default: m.AdminWorkspace })));
const SalesManagerWorkspace = lazy(() => import('@/screens/SalesManager/SalesManagerWorkspace').then(m => ({ default: m.SalesManagerWorkspace })));
const BoardWorkspace = lazy(() => import('@/screens/Board/BoardWorkspace').then(m => ({ default: m.BoardWorkspace })));
const AccountingWorkspace = lazy(() => import('@/screens/Accounting/AccountingWorkspace').then(m => ({ default: m.AccountingWorkspace })));
const CustomerCareWorkspace = lazy(() => import('@/screens/CustomerCare/CustomerCareWorkspace').then(m => ({ default: m.CustomerCareWorkspace })));
const SalesStaffWorkspace = lazy(() => import('@/screens/SalesStaff/SalesStaffWorkspace').then(m => ({ default: m.SalesStaffWorkspace })));
const CollaboratorWorkspace = lazy(() => import('@/screens/Collaborator/CollaboratorWorkspace').then(m => ({ default: m.CollaboratorWorkspace })));
const CheckeeWorkspace = lazy(() => import('@/screens/Checkee/CheckeeWorkspace').then(m => ({ default: m.CheckeeWorkspace })));
const ChannelOperations = lazy(() => import('@/components/crm/channel-operations').then(m => ({ default: m.ChannelOperations })));

export function CrmApp({ initialView }: { initialView?: View } = {}) {
  if (apiBase) return <CrmWorkspace initialView={initialView} />;
  return <DemoAccess>{(account, logout) => <CrmWorkspace key={account.id} initialView={initialView} demoAccount={account} onDemoLogout={logout} />}</DemoAccess>;
}

function CrmWorkspace({ initialView, demoAccount, onDemoLogout }: { initialView?: View; demoAccount?: DemoAccount; onDemoLogout?: () => void }) {
  const [view, setView] = useState<View>(initialView ?? 'dashboard');
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(!apiBase);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState(demoAccount?.name ?? 'CRM');
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [membershipType, setMembershipType] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<string[]>(demoAccount?.abilities ?? []);
  const [workspace, setWorkspace] = useState<ChannelSalesWorkspace>(demoAccount ? presentDemoWorkspace(demoChannelSalesWorkspace, demoAccount) : {
    data: [], metrics: { available: 0, approaching: 0, contracted: 0, expiring_soon: 0, contract_value: 0, collected_revenue: 0, commission_accrued: 0 }, packages: [], pending_reconciliations: [], server_time: new Date(0).toISOString()
  });
  const [search, setSearch] = useState('');
  const [dark, setDark] = useState(false);
  const [error, setError] = useState('');
  const has = (permission: string) => abilities.includes('*') || abilities.includes(permission);

  const loadWorkspace = useCallback(async (accessToken: string) => {
    if (!apiBase || !accessToken) return;
    const me = await request<{ user: { name: string; abilities: string[]; organization_name?: string | null; membership_type?: string | null } }>('/me', accessToken);
    setUserName(me.user.name);
    setAbilities(me.user.abilities);
    setOrganizationName(me.user.organization_name ?? null);
    setMembershipType(me.user.membership_type ?? null);
    if (me.user.abilities.includes('channel_sales.customer.view'))
      setWorkspace(await request<ChannelSalesWorkspace>('/channel-sales/workspace', accessToken));
  }, []);

  useEffect(() => {
    if (!apiBase) return;
    const saved = window.sessionStorage.getItem('kidsfit_token');
    if (saved) setToken(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!apiBase || !token) return;
    let active = true;
    void loadWorkspace(token).catch(cause => {
      if (!active) return;
      window.sessionStorage.removeItem('kidsfit_token');
      setToken('');
      setError(cause instanceof Error ? cause.message : 'Không thể tải dữ liệu CRM.');
    });
    return () => { active = false; };
  }, [token, loadWorkspace]);

  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await request<{ token: string; user: { name: string; abilities: string[] } }>('/login', undefined, {
        method: 'POST', body: JSON.stringify({ email, password })
      });
      sessionStorage.setItem('kidsfit_token', response.token);
      setUserName(response.user.name);
      setAbilities(response.user.abilities);
      setToken(response.token);
    } finally { setLoading(false); }
  };

  const logout = async () => {
    if (onDemoLogout) { onDemoLogout(); return; }
    if (token) await request('/logout', token, { method: 'POST' }).catch(() => undefined);
    sessionStorage.removeItem('kidsfit_token');
    setAbilities([]);
    setToken('');
  };

  const refresh = async () => {
    if (apiBase && token) await loadWorkspace(token);
  };

  const mutation = async (path: string, body: unknown) => {
    if (!apiBase || !token) throw new Error('Bản xem trước chỉ đọc. Kết nối Backend để cập nhật CRM.');
    await request(path, token, { method: 'POST', body: JSON.stringify(body) });
    await refresh();
  };
  const onRegister = async (input: RegisterApproachInput) => mutation('/channel-sales/approach-registrations', input);
  const onAddActivity = async (customer: ChannelCustomer, input: CustomerActivityInput) => {
    if (!customer.approach_registration_id) throw new Error('Trường chưa được đăng ký tiếp cận.');
    await mutation(`/channel-sales/approach-registrations/${customer.approach_registration_id}/activities`, input);
  };
  const onReportContract = async (customer: ChannelCustomer, input: ReportContractInput) => {
    if (!customer.approach_registration_id) throw new Error('Trường chưa được đăng ký tiếp cận.');
    await mutation(`/channel-sales/approach-registrations/${customer.approach_registration_id}/report-contract`, input);
  };
  const onRecordRevenue = async (customer: ChannelCustomer, input: RevenueReceiptInput) => {
    if (!customer.contract_id) throw new Error('Trường chưa có hợp đồng.');
    await mutation(`/channel-sales/contracts/${customer.contract_id}/revenue-receipts`, input);
  };

  const isAdmin = has('channel_sales.school.directory.manage') && has('channel_sales.scope.all');
  const isManager = !isAdmin && has('channel_sales.school.allocation.manage');
  const isDirector = !isAdmin && !isManager && (membershipType === 'DIRECTOR' || membershipType === 'BOARD' || demoAccount?.id === 'board');
  const isAccountant = !isAdmin && !isManager && !isDirector && (membershipType === 'ACCOUNTANT' || demoAccount?.id === 'accountant');
  const isCare = !isAdmin && !isManager && !isDirector && !isAccountant && (membershipType === 'CUSTOMER_SERVICE' || demoAccount?.id === 'care');
  const isCheckee = !isAdmin && !isManager && !isDirector && !isAccountant && !isCare && (membershipType === 'CHECKEE' || demoAccount?.id === 'checkee');
  const isSales = !isAdmin && !isManager && !isDirector && !isAccountant && !isCare && !isCheckee && (['SALES','COLLABORATOR','PARTNER_COLLABORATOR'].includes(membershipType ?? '') || demoAccount?.id === 'sales' || demoAccount?.id === 'ctv');

  // One Sales menu for both employee and collaborator. The legacy screen entrypoints
  // are only adapters until their page bodies are consolidated.
  const visibleNav = nav.filter(item =>
    isAdmin ? ['dashboard','admin-schools','admin-proposals','admin-team','admin-capacity','admin-policies','admin-reports'].includes(item.id)
    : isManager ? item.id.startsWith('manager-')
    : isDirector ? item.id.startsWith('role-board-')
    : isAccountant ? item.id.startsWith('role-accounting-')
    : isCare ? item.id.startsWith('role-customer-care-')
    : isCheckee ? item.id.startsWith('role-checkee-')
    : isSales ? (item.id.startsWith('role-sales-staff-') && !['role-sales-staff-schools','role-sales-staff-proposals'].includes(item.id)) ||
      (item.id.startsWith('role-collaborator-') && !['role-collaborator-dashboard','role-collaborator-income'].includes(item.id))
    : item.id === 'channel-sales' && has('channel_sales.customer.view')
  );
  const currentView = visibleNav.some(item => item.id === view) ? view : visibleNav[0]?.id ?? 'channel-sales';
  useEffect(()=>{
    const onPop=()=>{
      const next=pathToView(window.location.pathname);
      if (next && visibleNav.some(item=>item.id===next)) setView(next);
    };
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  },[visibleNav.map(item=>item.id).join('|')]);
  const navigate = (next: View) => {
    if (!visibleNav.some(item=>item.id===next)) return;
    setView(next);
    if (apiBase) window.history.pushState(null,'',viewToPath(next));
  };

  const roleProps = { apiBase, token, abilities, workspace, onChanged: refresh, search, setSearch, onRegister, onAddActivity, onReportContract, onRecordRevenue };
  const todayLabel = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (!ready) return <main className="grid min-h-screen place-items-center">Đang khởi tạo CRM…</main>;
  if (apiBase && !token) return <LoginPage loading={loading} onLogin={login} />;

  return <AppProviders key={demoAccount?.id ?? token}>
    <AppShell>
      <Sidebar visibleNav={visibleNav} currentView={currentView} onNavigate={navigate} userName={userName} demoAccount={demoAccount} membershipType={membershipType} organizationName={organizationName} isAdminWorkspace={isAdmin} apiBase={apiBase} onLogout={logout}/>
      <div className="pb-20 lg:pl-[248px] lg:pb-0">
        <Header todayLabel={todayLabel} userName={userName} search={search} setSearch={setSearch} dark={dark} setDark={setDark}/>
        <main className="crm-workspace-content mx-auto max-w-[1480px] space-y-5 px-4 py-5 sm:px-7 sm:py-6">
          {demoAccount && <p className="rounded-xl border border-amber-300 p-3 text-sm">Bản xem trước tĩnh, chỉ đọc. Hãy kết nối Backend để thay đổi dữ liệu thực.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Suspense fallback={<p>Đang tải màn hình…</p>}>
            {isAdmin && <AdminWorkspace section={currentView as import('@/screens/Admin/AdminWorkspace').AdminSection} {...roleProps}/>}
            {isManager && <SalesManagerWorkspace section={currentView as import('@/screens/SalesManager/SalesManagerWorkspace').ManagerSection} {...roleProps}/>}
            {currentView.startsWith('role-board-') && <BoardWorkspace section={currentView.slice('role-board-'.length) as import('@/screens/Board/BoardWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-accounting-') && <AccountingWorkspace section={currentView.slice('role-accounting-'.length) as import('@/screens/Accounting/AccountingWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-customer-care-') && <CustomerCareWorkspace section={currentView.slice('role-customer-care-'.length) as import('@/screens/CustomerCare/CustomerCareWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-sales-staff-') && <SalesStaffWorkspace section={currentView.slice('role-sales-staff-'.length) as import('@/screens/SalesStaff/SalesStaffWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-collaborator-') && <CollaboratorWorkspace section={currentView.slice('role-collaborator-'.length) as import('@/screens/Collaborator/CollaboratorWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-checkee-') && <CheckeeWorkspace section={currentView.slice('role-checkee-'.length) as import('@/screens/Checkee/CheckeeWorkspace').RoleSection} {...roleProps}/>}
            {currentView === 'channel-sales' && <ChannelOperations apiBase={apiBase} token={token} abilities={abilities} onChanged={refresh}
              customerView={(onOpenCustomer) => <ChannelSalesView onOpenCustomer={onOpenCustomer} workspace={workspace} search={search} setSearch={setSearch}
                canRegister={has('channel_sales.approach.register')} canAddActivity={has('channel_sales.activity.create')}
                canReportContract={has('channel_sales.contract.report')} canRecordRevenue={has('channel_sales.revenue.record')}
                onRegister={onRegister} onAddActivity={onAddActivity} onReportContract={onReportContract} onRecordRevenue={onRecordRevenue}/>}/>}
          </Suspense>
        </main>
      </div>
    </AppShell>
  </AppProviders>;
}

export function SchoolDashboard({workspace}: {workspace: ChannelSalesWorkspace}) {
  const stats = [
    ['Chưa đăng ký', workspace.metrics.available], ['Đang tiếp cận', workspace.metrics.approaching],
    ['Đã ký hợp đồng', workspace.metrics.contracted], ['Sắp hết hạn', workspace.metrics.expiring_soon]
  ] as const;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {stats.map(([label,value]) => <Card key={label}><CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{value.toLocaleString('vi-VN')}</p></CardContent></Card>)}
  </div>;
}
