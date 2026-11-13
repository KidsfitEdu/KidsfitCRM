'use client';

import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/AppShell';
import { AppProviders } from '@/providers/AppProviders';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LoginPage } from '@/screens/Auth/Login/LoginPage';
import { MascotLoadingState } from '@/components/common/mascot-loading-state';
import { PageLoading, AppRequestErrorState } from '@/components/common/app-loading';
import { ChannelSalesView } from '@/components/crm/channel-sales-view';
import { nav, type View } from '@/config/navigation';
import { canonicalSalesView, legacySalesWorkflowTab, salesMenuIds } from '@/config/sales-navigation';
import { canonicalCheckeeView, viewToPath, pathToView } from '@/config/routes';
import { canonicalBoardView, canonicalCareView } from '@/config/routes';
import { createApiClient, ApiRequestError, isBackendUnavailable } from '@/services/api.client';
import { type ChannelCustomer, type ChannelSalesWorkspace, type CustomerActivityInput, type RegisterApproachInput, type ReportContractInput, type RevenueReceiptInput } from '@/lib/channel-sales';

const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const request = createApiClient(apiBase);
// /health is mounted at the Backend origin, not under the /api prefix.
const healthRequest = createApiClient(apiBase ? new URL(apiBase).origin : '');
const AdminWorkspace = lazy(() => import('@/screens/Admin/AdminWorkspace').then(m => ({ default: m.AdminWorkspace })));
const SalesManagerWorkspace = lazy(() => import('@/screens/SalesManager/SalesManagerWorkspace').then(m => ({ default: m.SalesManagerWorkspace })));
const BoardWorkspace = lazy(() => import('@/screens/Board/BoardWorkspace').then(m => ({ default: m.BoardWorkspace })));
const AccountingWorkspace = lazy(() => import('@/screens/Accounting/AccountingWorkspace').then(m => ({ default: m.AccountingWorkspace })));
const CustomerCareWorkspace = lazy(() => import('@/screens/CustomerCare/CustomerCareWorkspace').then(m => ({ default: m.CustomerCareWorkspace })));
const SalesStaffWorkspace = lazy(() => import('@/screens/SalesStaff/SalesStaffWorkspace').then(m => ({ default: m.SalesStaffWorkspace })));
const CheckeeWorkspace = lazy(() => import('@/screens/Checkee/CheckeeWorkspace').then(m => ({ default: m.CheckeeWorkspace })));
const ChannelOperations = lazy(() => import('@/components/crm/channel-operations').then(m => ({ default: m.ChannelOperations })));

export function CrmApp({ initialView }: { initialView?: View } = {}) {
  if (!apiBase) return <p role="alert">Thiếu NEXT_PUBLIC_API_URL. Hãy cấu hình kết nối Backend để sử dụng dữ liệu CRM thật.</p>;
  return <CrmWorkspace initialView={initialView} />;
}

function CrmWorkspace({ initialView }: { initialView?: View }) {
  const [view, setView] = useState<View>(canonicalCareView(canonicalBoardView(canonicalCheckeeView(canonicalSalesView(initialView ?? 'dashboard')))));
  const [salesWorkflow, setSalesWorkflow] = useState<'invitations' | 'extensions' | undefined>(() => legacySalesWorkflowTab(initialView ?? 'dashboard'));
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'idle'|'checking'|'active'|'offline'|'error'>('idle');
  const [retryIndex, setRetryIndex] = useState(0);
  const [healthRetryIndex, setHealthRetryIndex] = useState(0);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [healthError, setHealthError] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('CRM');
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [membershipType, setMembershipType] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<string[]>([]);
  const [workspace, setWorkspace] = useState<ChannelSalesWorkspace>({
    data: [], metrics: { available: 0, approaching: 0, contracted: 0, expiring_soon: 0, contract_value: 0, collected_revenue: 0, commission_accrued: 0 }, pending_reconciliations: [], server_time: new Date(0).toISOString()
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
    if (saved) {
      setSessionStatus('checking');
      setHealthStatus('online');
      setToken(saved);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!apiBase || !ready || token || sessionStatus === 'checking') return;
    let active = true;
    setHealthStatus('checking');
    void healthRequest('/health').then(() => {
      if (active) { setHealthError(''); setHealthStatus('online'); }
    }).catch(cause => {
      if (!active) return;
      setHealthError(cause instanceof Error ? cause.message : 'Máy chủ hiện chưa sẵn sàng.');
      setHealthStatus('offline');
    });
    return () => { active = false; };
  }, [ready, token, sessionStatus, healthRetryIndex]);

  useEffect(() => {
    if (!apiBase || !token) return;
    let active = true;
    setSessionStatus('checking');
    void loadWorkspace(token).then(() => {
      if (active) { setConnectionMessage(''); setSessionStatus('active'); }
    }).catch(cause => {
      if (!active) return;
      if (cause instanceof ApiRequestError && cause.status === 401) {
        window.sessionStorage.removeItem('kidsfit_token');
        setToken('');
        setSessionStatus('idle');
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setConnectionMessage(cause instanceof Error ? cause.message : 'Không thể kết nối máy chủ.');
        setSessionStatus(isBackendUnavailable(cause) ? 'offline' : 'error');
      }
    });
    return () => { active = false; };
  }, [token, loadWorkspace, retryIndex]);

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
      setSessionStatus('checking');
      setToken(response.token);
    } finally { setLoading(false); }
  };

  const logout = async () => {
    if (token) await request('/logout', token, { method: 'POST' }).catch(() => undefined);
    sessionStorage.removeItem('kidsfit_token');
    setAbilities([]);
    setToken('');
    setSessionStatus('idle');
  };

  const refresh = async () => {
    if (apiBase && token) await loadWorkspace(token);
  };

  const mutation = async (path: string, body: unknown) => {
    if (!apiBase || !token) throw new Error('Vui lòng đăng nhập hệ thống CRM để thực hiện thao tác.');
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
  const isDirector = !isAdmin && !isManager && (membershipType === 'DIRECTOR' || membershipType === 'BOARD');
  const isAccountant = !isAdmin && !isManager && !isDirector && (membershipType === 'ACCOUNTANT');
  const isCare = !isAdmin && !isManager && !isDirector && !isAccountant && (membershipType === 'CUSTOMER_SERVICE');
  const isCheckee = !isAdmin && !isManager && !isDirector && !isAccountant && !isCare && (membershipType === 'CHECKEE');
  const isSales = !isAdmin && !isManager && !isDirector && !isAccountant && !isCare && !isCheckee && (['SALES','COLLABORATOR','PARTNER_COLLABORATOR'].includes(membershipType ?? ''));

  // One Sales menu for both employee and collaborator. The legacy screen entrypoints
  // are only adapters until their page bodies are consolidated.
  const visibleNav = nav.filter(item =>
    isAdmin ? ['dashboard','admin-schools','admin-proposals','admin-team','admin-capacity','admin-policies','admin-reports','admin-care-assignments'].includes(item.id)
    : isManager ? item.id.startsWith('manager-')
    : isDirector ? item.id.startsWith('role-board-')
    : isAccountant ? item.id.startsWith('role-accounting-')
    : isCare ? item.id.startsWith('role-customer-care-')
    : isCheckee ? item.id.startsWith('role-checkee-')
    : isSales ? salesMenuIds.includes(item.id)
    : item.id === 'channel-sales' && has('channel_sales.customer.view')
  );
  const currentView = visibleNav.some(item => item.id === view) ? view : visibleNav[0]?.id ?? 'channel-sales';
  useEffect(()=>{
    const onPop=()=>{
      const requested=pathToView(window.location.pathname);
      if (!requested) return;
      const next = canonicalCareView(canonicalBoardView(canonicalCheckeeView(isSales ? canonicalSalesView(requested) : requested)));
      if (visibleNav.some(item=>item.id===next)) {
        setSalesWorkflow(isSales ? legacySalesWorkflowTab(requested) : undefined);
        setView(next);
      }
    };
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  },[visibleNav,isSales]);
  const navigate = (next: View) => {
    if (!visibleNav.some(item=>item.id===next)) return;
    setView(next);
    setSalesWorkflow(undefined);
    window.history.pushState(null,'',viewToPath(next));
  };

  const roleProps = { apiBase, token, abilities, workspace, onChanged: refresh, search, setSearch, onRegister, onAddActivity, onReportContract, onRecordRevenue, salesWorkflow, onSalesNavigate: navigate };
  const todayLabel = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (!ready || (apiBase && token && sessionStatus === 'checking'))
    return <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-7"><PageLoading label={ready ? 'Đang xác thực tài khoản và tải dữ liệu...' : 'Đang khởi tạo CRM...'}/></div>;
  if (apiBase && token && sessionStatus === 'offline')
    return <MascotLoadingState state="offline" detail={connectionMessage}
      onRetry={() => { setConnectionMessage(''); setRetryIndex(index => index + 1); }}/>;
  if (apiBase && token && sessionStatus === 'error')
    return <AppRequestErrorState detail={connectionMessage}
      onRetry={() => { setConnectionMessage(''); setRetryIndex(index => index + 1); }}/>;
  if (apiBase && !token && healthStatus === 'checking')
    return <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-7"><PageLoading label="Đang kiểm tra kết nối đến máy chủ KIDSFIT CRM..."/></div>;
  if (apiBase && !token && healthStatus === 'offline')
    return <MascotLoadingState state="offline" detail={healthError}
      onRetry={() => { setHealthError(''); setHealthRetryIndex(index => index + 1); }}/>;
  if (apiBase && !token) return <LoginPage loading={loading} onLogin={login} />;

  return <AppProviders key={token}>
    <AppShell>
      <Sidebar visibleNav={visibleNav} currentView={currentView} onNavigate={navigate} userName={userName} membershipType={membershipType} organizationName={organizationName} isAdminWorkspace={isAdmin} apiBase={apiBase} onLogout={logout}/>
      <div className="pb-20 lg:pl-[248px] lg:pb-0">
        <Header todayLabel={todayLabel} userName={userName} search={search} setSearch={setSearch} dark={dark} setDark={setDark} apiBase={apiBase} token={token} onNavigate={navigate}/>
        <main className="crm-workspace-content mx-auto max-w-[1480px] space-y-5 px-4 py-5 sm:px-7 sm:py-6">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div key={currentView} className="crm-page-enter">
          <Suspense fallback={<PageLoading label="Đang chuẩn bị màn hình..." />}>
            {isAdmin && <AdminWorkspace section={currentView as import('@/screens/Admin/AdminWorkspace').AdminSection} {...roleProps}/>}
            {isManager && <SalesManagerWorkspace section={currentView as import('@/screens/SalesManager/SalesManagerWorkspace').ManagerSection} {...roleProps}/>}
            {currentView.startsWith('role-board-') && <BoardWorkspace section={currentView.slice('role-board-'.length) as import('@/screens/Board/BoardWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-accounting-') && <AccountingWorkspace section={currentView.slice('role-accounting-'.length) as import('@/screens/Accounting/AccountingWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-customer-care-') && <CustomerCareWorkspace section={currentView.slice('role-customer-care-'.length) as import('@/screens/CustomerCare/CustomerCareWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-sales-staff-') && <SalesStaffWorkspace section={currentView.slice('role-sales-staff-'.length) as import('@/screens/SalesStaff/SalesStaffWorkspace').RoleSection} {...roleProps}/>}
            {currentView.startsWith('role-checkee-') && <CheckeeWorkspace section={currentView.slice('role-checkee-'.length) as import('@/screens/Checkee/CheckeeWorkspace').RoleSection} {...roleProps}/>}
            {currentView === 'channel-sales' && <ChannelOperations apiBase={apiBase} token={token} abilities={abilities} onChanged={refresh}
              customerView={(onOpenCustomer) => <ChannelSalesView onOpenCustomer={onOpenCustomer} workspace={workspace} search={search} setSearch={setSearch}
                canRegister={has('channel_sales.approach.register')} canAddActivity={has('channel_sales.activity.create')}
                canReportContract={has('channel_sales.contract.report')} canRecordRevenue={has('channel_sales.revenue.record')}
                onRegister={onRegister} onAddActivity={onAddActivity} onReportContract={onReportContract} onRecordRevenue={onRecordRevenue}/>}/>}
          </Suspense>
          </div>
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
