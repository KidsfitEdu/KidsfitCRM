'use client';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import {
  ArrowRight,
  Check,
  Handshake,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DemoAccess } from './demo-access';
import { ChannelSalesView } from './channel-sales-view';
import { presentDemoWorkspace, type DemoAccount } from '@/lib/demo-auth';
import {
  demoChannelSalesWorkspace,
  type ChannelCustomer,
  type ChannelSalesWorkspace,
  type CustomerActivityInput,
  type RegisterApproachInput,
  type ReportContractInput,
  type RevenueReceiptInput,
} from '@/lib/channel-sales';
import {
  loadProductWorkspace,
  productNavigation,
  productPresentation,
  type ProductView,
} from '@/lib/product-workspace';

const ChannelOperations = lazy(() =>
  import('./channel-operations').then((module) => ({
    default: module.ChannelOperations,
  })),
);
const apiBase =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '');

class WorkspaceRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };
  if (!response.ok) {
    const errors = payload.errors as Record<string, string[]> | undefined;
    throw new WorkspaceRequestError(
      (errors ? Object.values(errors).flat()[0] : undefined) ??
        payload.message ??
        'Không thể kết nối máy chủ.',
      response.status,
    );
  }
  return payload as T;
}

const initials = (name: string) =>
  name
    .split(' ')
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
    value,
  );

export function CrmApp() {
  if (apiBase) return <ProductWorkspace />;
  return (
    <DemoAccess>
      {(account, logout) => (
        <ProductWorkspace
          key={account.id}
          demoAccount={account}
          onDemoLogout={logout}
        />
      )}
    </DemoAccess>
  );
}

function ProductWorkspace({
  demoAccount,
  onDemoLogout,
}: {
  demoAccount?: DemoAccount;
  onDemoLogout?: () => void;
}) {
  const [view, setView] = useState<ProductView>('registrations');
  const [search, setSearch] = useState('');
  const [dark, setDark] = useState(false);
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(!apiBase);
  const [loading, setLoading] = useState(false);
  const loadRevision = useRef(0);
  const [userName, setUserName] = useState(demoAccount?.name ?? '');
  const [abilities, setAbilities] = useState(demoAccount?.abilities ?? []);
  const [workspace, setWorkspace] = useState<ChannelSalesWorkspace | null>(
    demoAccount ? structuredClone(demoChannelSalesWorkspace) : null,
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!apiBase) return;
    try {
      const saved = sessionStorage.getItem('kidsfit_token') ?? '';
      if (saved) setLoading(true);
      setToken(saved);
    } catch {
      /* Sign-in remains available without session persistence. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    return () => document.documentElement.classList.remove('dark');
  }, [dark]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const load = useCallback(async (accessToken: string) => {
    if (!apiBase || !accessToken) return;
    const revision = ++loadRevision.current;
    setLoading(true);
    setError('');
    try {
      const result = await loadProductWorkspace(request, accessToken);
      if (revision !== loadRevision.current) return;
      setUserName(result.user.name);
      setAbilities(result.user.abilities);
      setWorkspace(result.workspace);
    } catch (cause) {
      if (revision !== loadRevision.current) return;
      setWorkspace(null);
      setError(
        cause instanceof Error ? cause.message : 'Không thể tải dữ liệu.',
      );
      if (cause instanceof WorkspaceRequestError && cause.status === 401) {
        try {
          sessionStorage.removeItem('kidsfit_token');
        } catch {
          /* No stored session. */
        }
        setToken('');
        setAbilities([]);
      }
    } finally {
      if (revision === loadRevision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load(token);
  }, [load, token]);

  const onLogin = async (email: string, password: string) => {
    ++loadRevision.current;
    setLoading(true);
    setError('');
    try {
      const result = await request<{
        token: string;
        user: { name: string; abilities: string[] };
      }>('/login', undefined, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          device_name: 'Kidsfit CRM Web',
        }),
      });
      try {
        sessionStorage.setItem('kidsfit_token', result.token);
      } catch {
        /* Memory-only session. */
      }
      setUserName(result.user.name);
      setAbilities(result.user.abilities);
      setToken(result.token);
    } finally {
      setLoading(false);
    }
  };
  const logout = async () => {
    ++loadRevision.current;
    if (onDemoLogout) {
      onDemoLogout();
      return;
    }
    if (token)
      await request('/logout', token, { method: 'POST' }).catch(
        () => undefined,
      );
    try {
      sessionStorage.removeItem('kidsfit_token');
    } catch {
      /* Memory-only session. */
    }
    setToken('');
    setLoading(false);
    setWorkspace(null);
    setAbilities([]);
    setError('');
    setNotice('');
  };
  const refreshChannelSales = async () => {
    if (!apiBase || !token) return;
    const revision = loadRevision.current;
    const refreshed = await request<ChannelSalesWorkspace>(
      '/channel-sales/workspace',
      token,
    );
    if (revision === loadRevision.current) setWorkspace(refreshed);
  };

  const registerApproach = async (input: RegisterApproachInput) => {
    if (apiBase && token) {
      await request('/channel-sales/approach-registrations', token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await refreshChannelSales();
    } else {
      const protectedUntil = new Date(Date.now() + 120 * 3600000).toISOString();
      setWorkspace((current) => {
        if (!current) return current;
        const existing = current.data.find(
          (item) => item.id === input.customer_id,
        );
        const row: ChannelCustomer = existing
          ? {
              ...existing,
              visible_status: 'APPROACHING',
              approach_registration_id: Date.now(),
              registration_status: 'ACTIVE',
              owner_user_name: userName,
              protected_until: protectedUntil,
              can_manage_approach: true,
            }
          : {
              id: Date.now(),
              code: `CUS-${Date.now()}`,
              display_name: input.display_name ?? 'Khách hàng mới',
              customer_type: input.customer_type ?? 'ORGANIZATION',
              tax_code: input.tax_code ?? null,
              phone: input.phone ?? null,
              email: input.email ?? null,
              contact_name: input.contact_name ?? null,
              source: input.source ?? null,
              visible_status: 'APPROACHING',
              lifecycle_status: 'PROSPECT',
              approach_registration_id: Date.now(),
              registration_status: 'ACTIVE',
              owner_user_name: userName,
              protected_until: protectedUntil,
              next_follow_up_at: null,
              contract_id: null,
              contract_code: null,
              contract_value: 0,
              collected_revenue: 0,
              commission_accrued: 0,
              reconciliation_status: null,
              can_manage_approach: true,
              can_record_revenue: false,
            };
        return {
          ...current,
          data: existing
            ? current.data.map((item) => (item.id === row.id ? row : item))
            : [row, ...current.data],
          metrics: {
            ...current.metrics,
            available: Math.max(
              0,
              current.metrics.available - (existing ? 1 : 0),
            ),
            approaching: current.metrics.approaching + 1,
          },
        };
      });
    }
    setNotice('Đã đăng ký quyền tiếp cận khách hàng trong 5 ngày.');
  };
  const addCustomerActivity = async (
    customer: ChannelCustomer,
    input: CustomerActivityInput,
  ) => {
    if (!customer.approach_registration_id)
      throw new Error('Khách hàng chưa có lượt tiếp cận đang hoạt động.');
    if (apiBase && token) {
      await request(
        `/channel-sales/approach-registrations/${customer.approach_registration_id}/activities`,
        token,
        { method: 'POST', body: JSON.stringify(input) },
      );
      await refreshChannelSales();
    } else {
      setWorkspace(
        (current) =>
          current && {
            ...current,
            data: current.data.map((item) =>
              item.id === customer.id
                ? {
                    ...item,
                    next_follow_up_at: input.next_follow_up_at ?? null,
                  }
                : item,
            ),
          },
      );
    }
    setNotice('Đã cập nhật lịch sử tiếp cận, thời hạn bảo vệ không đổi.');
  };
  const reportChannelContract = async (
    customer: ChannelCustomer,
    input: ReportContractInput,
  ) => {
    if (!customer.approach_registration_id)
      throw new Error('Khách hàng chưa có lượt tiếp cận hợp lệ.');
    if (apiBase && token) {
      await request(
        `/channel-sales/approach-registrations/${customer.approach_registration_id}/report-contract`,
        token,
        { method: 'POST', body: JSON.stringify(input) },
      );
      await refreshChannelSales();
    } else {
      const protection = new Date(input.signed_on);
      protection.setFullYear(protection.getFullYear() + 5);
      setWorkspace(
        (current) =>
          current && {
            ...current,
            data: current.data.map((item) =>
              item.id === customer.id
                ? {
                    ...item,
                    visible_status: 'CONTRACTED',
                    lifecycle_status: 'CONTRACTED',
                    registration_status: 'CONVERTED',
                    contract_id: Date.now(),
                    contract_code: input.contract_code,
                    contract_value: input.total_value,
                    protected_until: protection.toISOString(),
                    reconciliation_status: 'PENDING',
                    can_manage_approach: false,
                    can_record_revenue: true,
                  }
                : item,
            ),
            metrics: {
              ...current.metrics,
              approaching: Math.max(0, current.metrics.approaching - 1),
              contracted: current.metrics.contracted + 1,
              contract_value:
                current.metrics.contract_value + input.total_value,
            },
          },
      );
    }
    setNotice(
      'Đã gửi báo cáo hợp đồng. Hồ sơ trường học cần hoàn tất xác minh tại mục Trường học.',
    );
  };
  const recordChannelRevenue = async (
    customer: ChannelCustomer,
    input: RevenueReceiptInput,
  ) => {
    if (!customer.contract_id) throw new Error('Khách hàng chưa có hợp đồng.');
    if (apiBase && token) {
      await request(
        `/channel-sales/contracts/${customer.contract_id}/revenue-receipts`,
        token,
        { method: 'POST', body: JSON.stringify(input) },
      );
      await refreshChannelSales();
    } else {
      // Preserve the existing illustrative rate only in browser-only fixtures.
      const commission = Math.round(input.amount * 0.1);
      setWorkspace(
        (current) =>
          current && {
            ...current,
            data: current.data.map((item) =>
              item.id === customer.id
                ? {
                    ...item,
                    collected_revenue: item.collected_revenue + input.amount,
                    commission_accrued: item.commission_accrued + commission,
                  }
                : item,
            ),
            metrics: {
              ...current.metrics,
              collected_revenue:
                current.metrics.collected_revenue + input.amount,
              commission_accrued:
                current.metrics.commission_accrued + commission,
            },
          },
      );
    }
    setNotice('Đã ghi nhận doanh thu và bút toán hoa hồng tương ứng.');
  };

  if (!ready) return <Loading />;
  if (apiBase && !token)
    return <LoginScreen loading={loading} onLogin={onLogin} />;
  const nav = productNavigation(abilities);
  const can = (permission: string) => abilities.includes(permission);
  const shown =
    workspace &&
    (demoAccount ? presentDemoWorkspace(workspace, demoAccount) : workspace);
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-white/10 bg-[#152238] text-white lg:flex">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#8d7cf6] shadow-lg shadow-violet-500/20">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-[17px] font-bold tracking-tight">Kidsfit CRM</p>
            <p className="text-xs text-slate-400">
              {productPresentation.brand}
            </p>
          </div>
        </div>
        <nav className="mt-5 space-y-1 px-3" aria-label="Điều hướng chính">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${view === item.id ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/7'}`}
            >
              {item.id === 'overview' ? (
                <LayoutDashboard className="size-[18px]" />
              ) : (
                <Handshake className="size-[18px] text-[#a99df8]" />
              )}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mx-4 mt-auto mb-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <Package className="mb-3 size-5 text-[#b9afff]" />
          <p className="text-sm font-semibold">Phân phối sản phẩm</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            iSchool & F&B
            <br />
            Khách hàng · Hợp đồng · Hoa hồng
          </p>
        </div>
        <div className="mx-4 mb-5 flex items-center gap-3 rounded-xl p-2">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-xs font-bold text-[#633b38]">
            {initials(userName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="text-[11px] text-slate-400">
              {demoAccount?.roleLabel ?? 'Tài khoản tổ chức'}
            </p>
          </div>
          <button
            onClick={() => void logout()}
            aria-label="Đăng xuất"
            className="rounded-lg p-2 text-slate-400 hover:text-white"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>
      <div className="pb-24 lg:ml-[248px] lg:pb-8">
        <header className="flex min-h-20 items-center justify-between gap-3 border-b px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs text-muted-foreground">{today}</p>
            <h1 className="mt-1 text-lg font-bold tracking-tight">
              Chào anh, {userName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Đổi giao diện"
              onClick={() => setDark((value) => !value)}
              className="rounded-xl"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Đăng xuất"
              onClick={() => void logout()}
              className="rounded-xl lg:hidden"
            >
              <LogOut />
            </Button>
            <span className="ml-1 hidden rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 sm:block dark:bg-violet-950 dark:text-violet-200">
              {productPresentation.brand}
            </span>
          </div>
        </header>
        <div className="mx-auto max-w-[1480px] space-y-7 px-5 py-7 sm:px-8">
          {demoAccount && (
            <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
              <div>
                <p className="font-semibold">
                  Không gian trải nghiệm · {demoAccount.roleLabel}
                </p>
                <p className="mt-1 text-xs leading-5 opacity-80">
                  Dữ liệu mẫu, quyền được mô phỏng trên giao diện. Thay đổi thử
                  chỉ tồn tại trong phiên trình duyệt.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void logout()}>
                <LogOut /> Đổi tài khoản
              </Button>
            </aside>
          )}
          <section>
            <span className="mb-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-200">
              {productPresentation.brand}
            </span>
            <h2 className="text-3xl font-bold tracking-[-0.045em]">
              {view === 'overview'
                ? 'Tổng quan phân phối'
                : productPresentation.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {productPresentation.description}
            </p>
          </section>
          {loading ? (
            <Loading />
          ) : error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
            >
              {error}
              <Button
                variant="outline"
                size="sm"
                className="ml-3"
                onClick={() => void load(token)}
              >
                <RefreshCw /> Thử lại
              </Button>
            </div>
          ) : !shown || nav.length === 0 ? (
            <p
              role="alert"
              className="rounded-2xl border p-6 text-sm text-muted-foreground"
            >
              Tài khoản chưa được cấp quyền quản lý khách hàng sản phẩm. Vui
              lòng liên hệ Quản trị viên.
            </p>
          ) : view === 'overview' ? (
            <ProductOverview
              workspace={shown}
              onOpen={() => setView('registrations')}
            />
          ) : (
            <Suspense fallback={<Loading />}>
              <ChannelOperations
                apiBase={apiBase}
                token={token}
                abilities={abilities}
                onChanged={refreshChannelSales}
                customerView={(onOpenCustomer) => (
                  <ChannelSalesView
                    onOpenCustomer={onOpenCustomer}
                    workspace={shown}
                    search={search}
                    setSearch={setSearch}
                    canRegister={can('channel_sales.approach.register')}
                    canAddActivity={can('channel_sales.activity.create')}
                    canReportContract={can('channel_sales.contract.report')}
                    canRecordRevenue={can('channel_sales.revenue.record')}
                    onRegister={registerApproach}
                    onAddActivity={addCustomerActivity}
                    onReportContract={reportChannelContract}
                    onRecordRevenue={recordChannelRevenue}
                  />
                )}
              />
            </Suspense>
          )}
        </div>
      </div>
      {nav.length > 0 && (
        <nav
          className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-white/10 bg-[#152238]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl lg:hidden"
          aria-label="Điều hướng di động"
        >
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs ${view === item.id ? 'bg-white/10 text-[#b9afff]' : 'text-slate-300'}`}
            >
              {item.id === 'overview' ? (
                <LayoutDashboard className="size-4" />
              ) : (
                <Handshake className="size-4" />
              )}
              {item.shortLabel}
            </button>
          ))}
        </nav>
      )}
      {notice && (
        <output className="fixed bottom-24 right-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-[#152238] px-4 py-3 text-sm text-white shadow-2xl lg:bottom-6">
          <Check className="size-4 text-emerald-300" />
          {notice}
        </output>
      )}
    </main>
  );
}

function ProductOverview({
  workspace,
  onOpen,
}: {
  workspace: ChannelSalesWorkspace;
  onOpen: () => void;
}) {
  const { metrics } = workspace;
  const stats = [
    {
      label: 'Chưa đăng ký',
      value: metrics.available,
      hint: 'Sẵn sàng tiếp cận',
    },
    {
      label: 'Đang tiếp cận',
      value: metrics.approaching,
      hint: 'Đăng ký và bảo vệ khách hàng',
    },
    {
      label: 'Đã ký hợp đồng',
      value: metrics.contracted,
      hint: 'Theo dõi triển khai và chăm sóc',
    },
    {
      label: 'Sắp hết bảo vệ',
      value: metrics.expiring_soon,
      hint: 'Ưu tiên cập nhật tiến độ',
    },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold">{stat.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-3xl border-violet-200 bg-gradient-to-br from-violet-50 to-white dark:border-violet-900 dark:from-violet-950/30 dark:to-card">
        <CardContent className="grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
          <div>
            <ShieldCheck className="mb-4 size-8 text-violet-500" />
            <h3 className="text-xl font-bold">
              Một khách hàng, một quyền tiếp cận rõ ràng.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Đăng ký khách hàng trước khi tư vấn sản phẩm iSchool hoặc F&B. Báo
              cáo hợp đồng, theo dõi doanh thu thực thu và đối soát hoa hồng
              trong cùng một không gian.
            </p>
          </div>
          <Button
            size="lg"
            onClick={onOpen}
            className="rounded-xl bg-[#6558d3] hover:bg-[#594cc8]"
          >
            Mở đăng ký khách hàng <ArrowRight />
          </Button>
        </CardContent>
      </Card>
      {(workspace.capabilities?.view_revenue ||
        workspace.capabilities?.view_commission) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {workspace.capabilities?.view_revenue && (
            <Card className="rounded-2xl">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">
                  Doanh thu thực thu
                </p>
                <p className="mt-3 text-2xl font-bold">
                  {money(metrics.collected_revenue)}
                </p>
              </CardContent>
            </Card>
          )}
          {workspace.capabilities?.view_commission && (
            <Card className="rounded-2xl">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">
                  Hoa hồng phát sinh
                </p>
                <p className="mt-3 text-2xl font-bold">
                  {money(metrics.commission_accrued)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <output className="grid min-h-40 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
      Đang tải không gian làm việc…
    </output>
  );
}

function LoginScreen({
  loading,
  onLogin,
}: {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [error, setError] = useState('');
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setError('');
    try {
      const email = values.get('email');
      const password = values.get('password');
      await onLogin(
        typeof email === 'string' ? email : '',
        typeof password === 'string' ? password : '',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại.');
    }
  };
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#101a2b] p-5">
      <div className="absolute -left-32 -top-32 size-96 rounded-full bg-[#6558d3]/30 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-[#35b79b]/20 blur-3xl" />
      <Card className="relative w-full max-w-md border-white/10 bg-white/[.96] p-3 shadow-2xl dark:bg-[#1b2940]">
        <CardHeader>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#6558d3] text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-bold">Kidsfit CRM</p>
              <p className="text-xs text-muted-foreground">
                {productPresentation.brand}
              </p>
            </div>
          </div>
          <CardTitle className="text-2xl">Chào mừng trở lại</CardTitle>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để quản lý đăng ký khách hàng và sản phẩm.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <label
              htmlFor="product-login-email"
              className="grid gap-1.5 text-sm font-medium"
            >
              Email
              <Input
                id="product-login-email"
                name="email"
                type="email"
                defaultValue="admin@kidsfit.vn"
                autoComplete="username"
                required
                className="h-11 rounded-xl"
              />
            </label>
            <label
              htmlFor="product-login-password"
              className="grid gap-1.5 text-sm font-medium"
            >
              Mật khẩu
              <Input
                id="product-login-password"
                name="password"
                type="password"
                defaultValue="Kidsfit@2026"
                autoComplete="current-password"
                required
                className="h-11 rounded-xl"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#6558d3] hover:bg-[#594cc8]"
            >
              {loading ? 'Đang kết nối…' : 'Đăng nhập'}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Tài khoản mẫu local đã được điền sẵn.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
