'use client';

import { useEffect, useMemo, useState, type ReactNode, type SyntheticEvent } from 'react';
import {
  BadgeCheck,
  Eye,
  History,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileCheck2,
  FilePenLine,
  Handshake,
  Landmark,
  Phone,
  Plus,
  ReceiptText,
  SquarePen,
  Search,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { SchoolWorkLogDrawer } from '@/components/crm/schools/school-work-log-drawer';
import { SalesContractRevisions } from '@/components/roles/SalesContractRevisions';
import { SchoolProfileDetails } from '@/components/crm/schools/school-profile-details';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppCurrencyInput } from '@/components/common/inputs/app-currency-input';
import { appNotice } from '@/components/common/app-toast-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppPagination } from '@/components/common/app-pagination';
import { AppSelect } from '@/components/common/app-select';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { channelDate, channelRequest } from '@/lib/channel-operations';
import { paymentCycleForPlan } from '@/lib/contract-payment-plan';
import { validateContract, type ContractErrors, type ContractField } from '@/lib/contract-validation';
import type {
  ChannelCustomer,
  ChannelSalesWorkspace,
  CustomerActivityInput,
  RegisterApproachInput,
  ReportContractInput,
  RevenueReceiptInput,
} from '@/lib/channel-sales';

type SalesSchoolProfile = {
  data: { id:number; display_name:string; tax_code:string|null; address:string|null;
    province:string|null; district:string|null; phone:string|null; email:string|null;
    contact_name:string|null; contact_position:string|null; lifecycle_status:string };
  contracts: {id:number;contract_code:string;status:string;signed_on:string;
    protection_until:string|null;total_value:number|null}[];
  school_units:{id:number;name:string;unit_type:string;address:string|null;
    province:string;ward:string;contact_name:string|null;contact_position:string|null;
    contact_phone:string|null;school_phone?:string|null;email:string|null;note?:string|null}[];
};
type StatusFilter = 'ALL' | ChannelCustomer['visible_status'];
export type SalesCustomerMode = 'all' | 'mine' | 'activities';

type Props = {
  apiBase?: string;
  token?: string;
  mode?: SalesCustomerMode;
  embedded?: boolean;
  onOpenCustomer?: (id: number) => void;
  onExtensionSubmitted?: () => Promise<void>;
  workspace: ChannelSalesWorkspace;
  search: string;
  setSearch: (value: string) => void;
  canRegister: boolean;
  canAddActivity: boolean;
  canReportContract: boolean;
  canRecordRevenue: boolean;
  onRegister: (input: RegisterApproachInput) => Promise<void>;
  onAddActivity: (
    customer: ChannelCustomer,
    input: CustomerActivityInput,
  ) => Promise<void>;
  onReportContract: (
    customer: ChannelCustomer,
    input: ReportContractInput,
  ) => Promise<void>;
  onRecordRevenue: (
    customer: ChannelCustomer,
    input: RevenueReceiptInput,
  ) => Promise<void>;
};

const statusCopy = {
  AVAILABLE: {
    label: 'Chưa đăng ký',
    compact: 'Sẵn sàng tiếp cận',
    className:
      'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  APPROACHING: {
    label: 'Đang tiếp cận',
    compact: 'Bảo vệ 5 ngày',
    className:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  },
  CONTRACTED: {
    label: 'Đã ký hợp đồng',
    compact: 'Bảo vệ 5 năm',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
} as const;

// Contract workflow is shown independently of the three school lifecycle statuses.
const contractBadge = (customer: ChannelCustomer) => {
  if (customer.contract_id == null) return statusCopy[customer.visible_status];
  const status = customer.contract_status?.toUpperCase();
  const blue = 'border-blue-200 bg-blue-50 text-blue-800';
  const amber = 'border-amber-200 bg-amber-50 text-amber-800';
  const red = 'border-red-200 bg-red-50 text-red-800';
  if (status === 'PENDING_REVIEW' || status === 'MANAGER_REVIEW')
    return { label: 'Chờ Quản lý duyệt', compact: 'Hồ sơ đã gửi', className: blue };
  if (status === 'MANAGER_REVIEWED' || status === 'SENT_TO_CHECKEE' || status === 'IN_VERIFICATION' || status === 'PENDING_VERIFICATION' || status === 'PENDING_CHECKEE' || status === 'UNDER_VERIFICATION')
    return { label: 'Chờ CHECKEE xác minh', compact: 'CHECKEE đang xử lý', className: blue };
  if (status === 'NEEDS_REVISION' || status === 'NEEDS_INFO' || status === 'RETURNED')
    return { label: 'Cần bổ sung hồ sơ', compact: 'Bổ sung hồ sơ hiện có', className: amber };
  if (status === 'REJECTED')
    return { label: 'Hồ sơ bị từ chối', compact: 'Xem lý do từ chối', className: red };
  if (status === 'CANCELLED')
    return { label: 'Hợp đồng đã hủy', compact: 'Xem lịch sử hồ sơ', className: red };
  if (status === 'PENDING_KIDSFIT')
    return { label: 'Hồ sơ cũ cần rà soát bảo vệ', compact: 'Đã được CHECKEE xác minh', className: amber };
  if (status === 'VERIFIED')
    return { label: 'Đã xác minh hợp đồng', compact: 'Hợp đồng hợp lệ', className: statusCopy.CONTRACTED.className };
  if (status === 'ACTIVE')
    return { label: customer.visible_status === 'CONTRACTED' ? 'Đã xác minh hợp đồng' : 'Hợp đồng đang hiệu lực', compact: 'Xem chi tiết hợp đồng', className: statusCopy.CONTRACTED.className };
  return { label: 'Đã nộp hồ sơ hợp đồng', compact: 'Theo dõi tình trạng hồ sơ', className: blue };
};

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const shortMoney = (value: number) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)} triệu`;

const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(
        new Date(
          value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value)
            ? value
            : `${value}Z`,
        ),
      )
    : '—';

const idempotencyKey = (prefix: string) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;

export function ChannelSalesView({
  apiBase,
  token,
  mode = 'all',
  embedded = false,
  onOpenCustomer,
  onExtensionSubmitted,
  workspace,
  search,
  setSearch,
  canRegister,
  canAddActivity,
  canReportContract,
  canRecordRevenue,
  onRegister,
  onAddActivity,
  onReportContract,
  onRecordRevenue,
}: Props) {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [draftSearch, setDraftSearch] = useState(search);
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [minePage, setMinePage] = useState<{data:ChannelCustomer[];total:number}|null>(null);
  const [mineLoading,setMineLoading] = useState(false);
  const [mineError,setMineError] = useState('');
  const [registerCustomer, setRegisterCustomer] = useState<
    ChannelCustomer | null | undefined
  >(undefined);
  const [historyCustomer, setHistoryCustomer] = useState<ChannelCustomer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<ChannelCustomer | null>(null);
  const [schoolProfile,setSchoolProfile] = useState<SalesSchoolProfile|null>(null);
  const [profileError,setProfileError] = useState('');
  const [activityCustomer, setActivityCustomer] =
    useState<ChannelCustomer | null>(null);
  const [extensionCustomer, setExtensionCustomer] = useState<ChannelCustomer | null>(null);
  const [extensionRefresh, setExtensionRefresh] = useState(0);
  const [contractCustomer, setContractCustomer] =
    useState<ChannelCustomer | null>(null);
  const [checkingContract, setCheckingContract] = useState(false);
  const [revisionContractId, setRevisionContractId] = useState<number | null>(null);

  const openContractReport = async (customer: ChannelCustomer) => {
    if (checkingContract) return;
    if (customer.contract_id !== null) {
      appNotice.warning('Hợp đồng đã được báo cáo', 'Vui lòng theo dõi hồ sơ xác minh hoặc bổ sung hồ sơ nếu được yêu cầu.');
      return;
    }
    if (!apiBase || !token) {
      appNotice.error('Không thể kiểm tra hợp đồng.', 'Chưa kết nối API. Vui lòng thử lại.');
      return;
    }
    setCheckingContract(true);
    try {
      // Refresh the server state before showing an expensive upload form.
      const profile = await channelRequest<SalesSchoolProfile>(apiBase, token, `/customers/${customer.id}`);
      if (profile.contracts.length > 0) {
        appNotice.warning('Hợp đồng đã được báo cáo', 'Trường đã có hồ sơ hợp đồng. Vui lòng theo dõi xác minh hoặc bổ sung hồ sơ theo yêu cầu.');
        setExtensionRefresh(value => value + 1);
        return;
      }
      setContractCustomer(customer);
    } catch (cause) {
      appNotice.error('Không thể kiểm tra trạng thái hợp đồng.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setCheckingContract(false);
    }
  };
  const [receiptCustomer, setReceiptCustomer] =
    useState<ChannelCustomer | null>(null);

  useEffect(()=>{
    if(!detailCustomer || !apiBase || !token){setSchoolProfile(null);return;}
    let active=true;setSchoolProfile(null);setProfileError('');
    void channelRequest<SalesSchoolProfile>(apiBase,token,`/customers/${detailCustomer.id}`)
      .then(result=>{if(active)setSchoolProfile(result);})
      .catch(err=>{if(active)setProfileError(err instanceof Error?err.message:'Không tải được hồ sơ trường.');});
    return()=>{active=false;};
  },[detailCustomer,apiBase,token]);
  const serverMine = mode === 'mine' && Boolean(apiBase && token);
  // Refresh active approach ownership when its server-side protection expires.
  useEffect(() => {
    if (!serverMine) return;
    const interval = window.setInterval(() => setExtensionRefresh(value => value + 1), 30_000);
    return () => window.clearInterval(interval);
  }, [serverMine]);
  useEffect(()=>{
    if(!serverMine)return;
    let active=true;
    setMineLoading(true);setMineError('');
    const params=new URLSearchParams({page:String(listPage),pageSize:String(listPageSize),status:filter});
    if(search.trim())params.set('search',search.trim());
    void channelRequest<{data:ChannelCustomer[];total:number}>(apiBase!,token!,`/schools/mine?${params}`)
      .then(result=>{if(active)setMinePage(result);})
      .catch(err=>{if(active){setMinePage(null);setMineError(err instanceof Error?err.message:'Không tải được trường của tôi.');}})
      .finally(()=>{if(active)setMineLoading(false);});
    return()=>{active=false;};
  },[serverMine,apiBase,token,listPage,listPageSize,filter,search,workspace,extensionRefresh]);
  const scopedCustomers = useMemo(() => (serverMine ? (minePage?.data ?? []) : workspace.data).filter(customer =>
    mode === 'all' || (mode === 'activities'
      ? customer.visible_status === 'APPROACHING' && customer.can_manage_approach
      : customer.can_manage_approach || (customer.visible_status === 'CONTRACTED' && customer.contract_id !== null))
  ), [mode, workspace.data, minePage, serverMine]);
  const customers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi');
    return scopedCustomers.filter(
      (customer) =>
        (serverMine || filter === 'ALL' || customer.visible_status === filter) &&
        (serverMine || !term ||
          [
            customer.display_name,
            customer.code,
            customer.phone,
            customer.tax_code,
            customer.contact_name,
          ].some((value) => value?.toLocaleLowerCase('vi').includes(term))),
    );
  }, [filter, search, scopedCustomers, serverMine]);

  const totalPages = Math.max(1, Math.ceil((serverMine ? (minePage?.total ?? 0) : customers.length) / listPageSize));
  const currentPage = Math.min(listPage, totalPages);
  const pageCustomers = serverMine ? customers : customers.slice((currentPage - 1) * listPageSize, currentPage * listPageSize);

  const tabs: { id: StatusFilter; label: string; count: number }[] = [
    {
      id: 'ALL',
      label: 'Tất cả',
      count: mode === 'all' ? workspace.metrics.available + workspace.metrics.approaching + workspace.metrics.contracted : scopedCustomers.length,
    },
    {
      id: 'AVAILABLE',
      label: 'Chưa đăng ký',
      count: mode === 'all' ? workspace.metrics.available : scopedCustomers.filter(customer => customer.visible_status === 'AVAILABLE').length,
    },
    {
      id: 'APPROACHING',
      label: 'Đang tiếp cận',
      count: mode === 'all' ? workspace.metrics.approaching : scopedCustomers.filter(customer => customer.visible_status === 'APPROACHING').length,
    },
    {
      id: 'CONTRACTED',
      label: 'Đã ký',
      count: mode === 'all' ? workspace.metrics.contracted : scopedCustomers.filter(customer => customer.visible_status === 'CONTRACTED').length,
    },
  ];

  return (
    <div className={embedded ? 'space-y-0' : 'space-y-6'}>
      {mode === 'all' && <section className="relative overflow-hidden rounded-[28px] bg-[#0e2a1a] px-6 py-7 text-white shadow-[0_26px_70px_rgba(17,29,49,.2)] sm:px-8">
        <div className="absolute -right-20 -top-36 size-80 rounded-full bg-[#4caf50]/20 blur-3xl" />
        <div className="absolute -bottom-44 left-1/3 size-80 rounded-full bg-[#20b895]/20 blur-3xl" />
        <div className="relative grid gap-7 xl:grid-cols-[1.25fr_.75fr] xl:items-end">
          <div>
            <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              <ShieldCheck className="mr-1 size-3.5" /> Quyền bảo vệ khách hàng
            </Badge>
            <h3 className="mt-5 max-w-2xl text-3xl font-bold tracking-[-0.045em] sm:text-4xl">
              Một khách hàng, một quyền tiếp cận rõ ràng.
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Đăng ký tiếp cận trong 5 ngày, xác minh hợp đồng để ghi nhận bảo
              vệ dài hạn và theo dõi doanh thu, hoa hồng có thể đối soát.
            </p>
            {canRegister && (
              <Button
                onClick={() => setRegisterCustomer(null)}
                className="mt-6 h-11 rounded-xl bg-white px-5 text-[#172238] shadow-xl hover:bg-slate-100"
              >
                <Plus /> Đăng ký tiếp cận
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroMetric
              label="Giá trị hợp đồng"
              value={shortMoney(workspace.metrics.contract_value)}
              icon={<FileCheck2 />}
            />
            <HeroMetric
              label="Doanh thu thực thu"
              value={
                workspace.capabilities?.view_revenue === false
                  ? 'Ẩn theo quyền'
                  : shortMoney(workspace.metrics.collected_revenue)
              }
              icon={<Landmark />}
            />
            <HeroMetric
              label="Hoa hồng phát sinh"
              value={
                workspace.capabilities?.view_commission === false
                  ? 'Ẩn theo quyền'
                  : shortMoney(workspace.metrics.commission_accrued)
              }
              icon={<CircleDollarSign />}
            />
            <HeroMetric
              label="Sắp hết bảo vệ"
              value={`${workspace.metrics.expiring_soon} khách hàng`}
              icon={<CalendarClock />}
            />
          </div>
        </div>
      </section>}

      {mode === 'all' && <section className="grid gap-3 sm:grid-cols-3">
        <StatusSummary
          icon={<Sparkles />}
          label="Chưa đăng ký"
          value={workspace.metrics.available}
          caption="Có thể tiếp cận ngay"
          tone="slate"
        />
        <StatusSummary
          icon={<Handshake />}
          label="Đang tiếp cận"
          value={workspace.metrics.approaching}
          caption="Đang trong cửa sổ 5 ngày"
          tone="amber"
        />
        <StatusSummary
          icon={<BadgeCheck />}
          label="Đã ký hợp đồng"
          value={workspace.metrics.contracted}
          caption="Được bảo vệ 5 năm"
          tone="emerald"
        />
      </section>}

      <Card className={embedded ? 'overflow-hidden rounded-none border-0 shadow-none' : 'overflow-hidden border-0 shadow-sm ring-1 ring-border/80'}>
        <CardContent className="p-0">
          {embedded ? <form onSubmit={event=>{event.preventDefault();setSearch(draftSearch.trim());setListPage(1);}}
            className="flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
            <div className="relative min-w-[190px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
              <Input aria-label="Tìm trường đang phụ trách" placeholder="Tên trường, mã trường, điện thoại..."
                className="h-11 w-full rounded-xl pl-10" value={draftSearch} onChange={event=>setDraftSearch(event.target.value)}/>
            </div>
            {mode === 'mine' && <AppSelect ariaLabel="Lọc trạng thái trường" className="w-full sm:w-48"
              value={filter} options={[{value:'ALL',label:'Tất cả trạng thái'},
                {value:'APPROACHING',label:'Đang tiếp cận'},{value:'CONTRACTED',label:'Đã ký hợp đồng'}]}
              onValueChange={next=>{setFilter(next as StatusFilter);setListPage(1);}}/>}
            <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
            <AppButton type="button" tone="outline" size="icon-lg" className="h-11 w-11 min-w-11 rounded-lg p-0"
              aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={()=>{setDraftSearch('');setSearch('');setFilter('ALL');setListPage(1);}}>
              <RotateCcw className="size-4" aria-hidden="true"/>
            </AppButton>
          </form> : <div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1">
              {tabs.filter(tab => mode === 'all' || (mode === 'mine' && tab.id !== 'AVAILABLE')).filter(() => mode !== 'activities').map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {setFilter(tab.id);setListPage(1);}}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${filter === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab.label}
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {setSearch(event.target.value);setListPage(1);}}
                className="h-10 rounded-xl bg-background pl-9"
                placeholder="Tên, MST, điện thoại…"
              />
            </div>
          </div>}

          <div className={`hidden gap-4 border-b bg-[#1b5e20] px-5 py-3.5 text-[11px] font-bold uppercase tracking-[.06em] text-white xl:grid ${mode === 'mine' ? 'xl:grid-cols-[minmax(300px,1.8fr)_minmax(140px,.75fr)_minmax(165px,.85fr)_minmax(225px,1.1fr)]' : 'xl:grid-cols-[minmax(230px,1.45fr)_minmax(160px,.8fr)_minmax(170px,.9fr)_minmax(150px,.7fr)_auto]'}`}>
            <span>{mode === 'mine' ? 'Trường học' : 'Khách hàng'}</span>
            <span className={mode === 'mine' ? 'text-center' : ''}>Trạng thái</span>
            <span className={mode === 'mine' ? 'text-center' : ''}>{mode === 'mine' ? 'Thời hạn bảo vệ' : 'Quyền bảo vệ'}</span>
            {mode !== 'mine' && <span>Tài chính</span>}
            <span className="text-right">Thao tác</span>
          </div>
          {mineError && <p role="alert" className="px-4 py-3 text-sm text-red-700">{mineError}</p>}
          {mineLoading && <p className="px-4 py-3 text-sm text-muted-foreground">Đang tải trường của tôi…</p>}
          <div className="divide-y divide-border/70">
            {pageCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onOpenDetail={mode === 'mine' ? () => setDetailCustomer(customer)
                  : onOpenCustomer ? () => onOpenCustomer(customer.id) : undefined}
                mineMode={mode === 'mine'}
                onHistory={() => setHistoryCustomer(customer)}
                onExtension={() => setExtensionCustomer(customer)}
                canRequestExtension={Boolean(apiBase && token && customer.can_request_extension)}
                canSeeRevenue={workspace.capabilities?.view_revenue !== false}
                canRegister={mode === 'all' && canRegister}
                canAddActivity={canAddActivity}
                canReportContract={canReportContract}
                canRecordRevenue={canRecordRevenue}
                onRegister={() => setRegisterCustomer(customer)}
                onActivity={() => setActivityCustomer(customer)}
                onContract={() => { void openContractReport(customer); }}
                onRevision={() => { if (customer.contract_id !== null) setRevisionContractId(customer.contract_id); }}
                onReceipt={() => setReceiptCustomer(customer)}
              />
            ))}
            {customers.length === 0 && (
              <div className="grid min-h-60 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                    <Search className="size-5" />
                  </div>
                  <p className="mt-4 font-semibold">{mode === 'activities' ? 'Chưa có trường cần tư vấn' : mode === 'mine' ? 'Chưa có trường trong danh sách của bạn' : 'Chưa tìm thấy khách hàng'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode === 'all' ? 'Thử từ khóa khác hoặc tạo lượt tiếp cận mới.' : 'Hãy kiểm tra bộ lọc hoặc danh sách trường được phân công.'}
                  </p>
                </div>
              </div>
            )}
          </div>
          {mode !== 'all' && <AppPagination page={currentPage} pageSize={listPageSize} total={serverMine ? minePage?.total ?? 0 : customers.length}
            disabled={false} showSummary={false} onPageChange={setListPage} pageSizeOptions={[10,20,50,100]}
            onPageSizeChange={size=>{setListPageSize(size);setListPage(1);}}/>}
        </CardContent>
      </Card>

      <AppDrawer open={detailCustomer !== null} onOpenChange={open => { if (!open) setDetailCustomer(null); }}
        title={detailCustomer?.display_name ?? 'Hồ sơ trường học'}
        description={detailCustomer?.code ?? ''} wide>
        {profileError && <p role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-red-700">{profileError}</p>}
        {!schoolProfile && !profileError && <p className="text-sm text-muted-foreground">Đang tải thông tin trường…</p>}
        {schoolProfile && <SchoolProfileDetails units={schoolProfile.school_units} />}
      </AppDrawer>
      {historyCustomer && apiBase && token && <SchoolWorkLogDrawer open={true}
        onOpenChange={open=>{if(!open)setHistoryCustomer(null);}}
        customerId={historyCustomer.id} schoolName={historyCustomer.display_name} apiBase={apiBase} token={token}/>}
      {registerCustomer !== undefined && (
        <RegisterApproachDialog
          customer={registerCustomer}
          onClose={() => setRegisterCustomer(undefined)}
          onSubmit={async (input) => {
            await onRegister(input);
            setRegisterCustomer(undefined);
          }}
        />
      )}
      {activityCustomer && (
        <ActivityDialog
          customer={activityCustomer}
          onClose={() => setActivityCustomer(null)}
          onSubmit={async (input) => {
            await onAddActivity(activityCustomer, input);
            setActivityCustomer(null);
          }}
        />
      )}
      {extensionCustomer && apiBase && token && (
        <ExtensionDialog key={extensionCustomer.approach_registration_id ?? extensionCustomer.id}
          customer={extensionCustomer} apiBase={apiBase} token={token}
          onClose={() => setExtensionCustomer(null)}
          onSubmitted={async () => {
            setExtensionCustomer(null);
            setExtensionRefresh(value => value + 1);
            await onExtensionSubmitted?.();
          }} />
      )}
      {contractCustomer && (
        <ContractDialog
          apiBase={apiBase} token={token}
          customer={contractCustomer}
          packages={workspace.packages}
          onClose={() => setContractCustomer(null)}
          onSubmit={async (input) => {
            try {
              await onReportContract(contractCustomer, input);
              setContractCustomer(null);
              setExtensionRefresh(value => value + 1);
            } catch (cause) {
              const message = cause instanceof Error ? cause.message : '';
              if (message.includes('đã báo cáo hợp đồng')) {
                setExtensionRefresh(value => value + 1);
                setContractCustomer(null);
              }
              throw cause;
            }
          }}
        />
      )}
      {revisionContractId !== null && apiBase && token && (
        <SalesContractRevisions key={revisionContractId} contractId={revisionContractId}
          apiBase={apiBase} token={token} onClose={() => setRevisionContractId(null)}
          onChanged={async () => {
            setExtensionRefresh(value => value + 1);
            await onExtensionSubmitted?.();
          }} />
      )}
      {receiptCustomer && (
        <ReceiptDialog
          apiBase={apiBase} token={token}
          customer={receiptCustomer}
          onClose={() => setReceiptCustomer(null)}
          onSubmit={async (input) => {
            await onRecordRevenue(receiptCustomer, input);
            setReceiptCustomer(null);
          }}
        />
      )}
    </div>
  );
}

function CustomerRow({
  mineMode,
  onHistory,
  onExtension,
  canRequestExtension,
  canSeeRevenue,
  onOpenDetail,
  customer,
  canRegister,
  canAddActivity,
  canReportContract,
  canRecordRevenue,
  onRegister,
  onActivity,
  onContract,
  onRevision,
  onReceipt,
}: {
  mineMode: boolean;
  onHistory: () => void;
  onExtension: () => void;
  canRequestExtension: boolean;
  canSeeRevenue: boolean;
  onOpenDetail?: () => void;
  customer: ChannelCustomer;
  canRegister: boolean;
  canAddActivity: boolean;
  canReportContract: boolean;
  canRecordRevenue: boolean;
  onRegister: () => void;
  onActivity: () => void;
  onContract: () => void;
  onRevision: () => void;
  onReceipt: () => void;
}) {
  const urgency = mineMode && customer.visible_status === 'APPROACHING' && customer.protected_until
    ? protectionUrgency(customer.protected_until) : null;
  // Rendering the extension icon is separate from authorization to submit a request.
  const activeApproach = mineMode && customer.visible_status === 'APPROACHING' &&
    Boolean(customer.approach_registration_id && customer.protected_until &&
      new Date(customer.protected_until).getTime() > Date.now());
  const showExtension = activeApproach && customer.contract_id === null;
  const extensionBlocked = !canRequestExtension || Boolean(customer.extension_pending);
  const extensionHint = customer.extension_pending
    ? 'Yêu cầu gia hạn đang chờ Quản lý bán hàng duyệt.'
    : customer.extension_unavailable_reason || (canRequestExtension ? 'Xin gia hạn tiếp cận' : 'Chưa đủ điều kiện xin gia hạn.');
  const status = contractBadge(customer);
  return (
    <div className={`grid gap-4 px-4 py-5 transition-colors hover:bg-muted/25 sm:px-5 xl:items-center ${mineMode ? 'xl:grid-cols-[minmax(300px,1.8fr)_minmax(140px,.75fr)_minmax(165px,.85fr)_minmax(225px,1.1fr)]' : 'xl:grid-cols-[minmax(230px,1.45fr)_minmax(160px,.8fr)_minmax(170px,.9fr)_minmax(150px,.7fr)_auto]'}`}>
      <div className="flex min-w-0 gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e8f5e9] text-[#1b5e20] dark:bg-[#1b5e20]/20">
          {customer.customer_type === 'ORGANIZATION' ? (
            <Building2 className="size-5" />
          ) : (
            <UserRound className="size-5" />
          )}
        </div>
        <div className="min-w-0">
          <button
            type="button"
            disabled={!onOpenDetail}
            onClick={onOpenDetail}
            className="max-w-full truncate text-left font-semibold tracking-[-0.01em] enabled:hover:text-primary enabled:hover:underline"
          >
            {customer.display_name}
          </button>
          {mineMode ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {customer.address || 'Chưa cập nhật địa chỉ'}
            </p>
          ) : (
            <>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {customer.tax_code ? `MST ${customer.tax_code}` : customer.code}
                {customer.contact_name ? ` · ${customer.contact_name}` : ''}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground xl:hidden">
                <Phone className="size-3" />{' '}
                {customer.phone ?? 'Chưa có số điện thoại'}
              </p>
            </>
          )}
        </div>
      </div>
      <div className={mineMode ? 'text-center' : ''}>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {status.compact}
        </p>
      </div>
      <div className={mineMode ? 'text-center text-sm' : 'text-sm'}>
        {customer.protected_until ? (
          <>
            <div className={mineMode ? 'flex items-center justify-center gap-1.5 font-medium' : 'flex items-center gap-1.5 font-medium'}>
              <ShieldCheck className={`size-4 ${urgency === 'critical' ? 'text-red-600' : urgency === 'warning' ? 'text-amber-600' : 'text-[#1b5e20]'}`}/>
              <span>{mineMode ? `Đến ${channelDate(customer.protected_until)}` : (customer.owner_user_name ?? 'Đã xác lập quyền')}</span>
            </div>
            {(!mineMode || customer.visible_status === 'APPROACHING') && (
              <p className={`mt-1 text-xs ${urgency === 'critical' ? 'font-bold text-red-700 dark:text-red-400' : urgency === 'warning' ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                {customer.visible_status === 'APPROACHING'
                  ? timeRemaining(customer.protected_until)
                  : `Đến ${channelDate(customer.protected_until)}`}
              </p>
            )}
            {urgency === 'critical' && <span className="mt-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">Khẩn cấp · sắp hết hạn</span>}
            {urgency === 'warning' && <span className="mt-1 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">Sắp hết hạn</span>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có quyền bảo vệ</p>
        )}
      </div>
      {!mineMode && <div className="text-sm">
        {customer.contract_id && canSeeRevenue ? (
          <>
            <p className="font-semibold">{money(customer.collected_revenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              / {money(customer.contract_value)}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">{customer.phone ?? '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {customer.next_follow_up_at
                ? `Hẹn ${dateTime(customer.next_follow_up_at)}`
                : 'Chưa có lịch hẹn'}
            </p>
          </>
        )}
      </div>}
      <div className="flex flex-wrap justify-end gap-2 xl:min-w-44">
        {mineMode && <>
          <Button type="button" size="icon" variant="outline" className="size-9 rounded-lg" onClick={onOpenDetail}
            disabled={!onOpenDetail} title="Xem chi tiết trường" aria-label={`Xem chi tiết ${customer.display_name}`}><Eye className="size-4"/></Button>
          {canAddActivity && customer.can_manage_approach && customer.visible_status === 'APPROACHING' && (
            <Button type="button" size="icon" variant="outline" className="size-9 rounded-lg" onClick={onActivity}
              title="Cập nhật tư vấn" aria-label={`Cập nhật tư vấn ${customer.display_name}`}><SquarePen className="size-4"/></Button>
          )}
          <Button type="button" size="icon" variant="outline" className="size-9 rounded-lg" onClick={onHistory}
            title="Lịch sử tiếp cận" aria-label={`Lịch sử tiếp cận ${customer.display_name}`}><History className="size-4"/></Button>
          {showExtension && (
            <span title={extensionHint} className="inline-flex" aria-label={extensionBlocked ? `${extensionHint} - ${customer.display_name}` : undefined}>
              <Button type="button" size="icon" variant="outline"
                className={`size-9 rounded-lg ${extensionBlocked ? 'cursor-not-allowed border-slate-300 text-slate-500 opacity-60' : urgency === 'critical' ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100' : 'border-amber-500 text-amber-700 hover:bg-amber-50'}`}
                disabled={extensionBlocked} onClick={onExtension} title={extensionHint}
                aria-label={`${extensionHint} - ${customer.display_name}`}>
                <CalendarClock className="size-4" aria-hidden="true"/>
              </Button>
            </span>
          )}
          {canReportContract && customer.contract_id !== null && customer.contract_status === 'NEEDS_REVISION' && (

            <Button type="button" size="icon" variant="outline" className="size-9 rounded-lg border-amber-500 text-amber-800"

              onClick={onRevision} title="Chỉnh sửa hợp đồng theo yêu cầu Quản lý"

              aria-label={`Chỉnh sửa hợp đồng ${customer.display_name}`}>

              <FilePenLine className="size-4" aria-hidden="true"/>

            </Button>

          )}
          {canReportContract && customer.can_manage_approach && customer.visible_status === 'APPROACHING' && !customer.contract_id && (
            <Button type="button" size="icon" variant="outline"
              className="size-9 rounded-lg border-green-700 text-green-800"
              onClick={onContract} title="Báo cáo hợp đồng đã ký"
              aria-label={`Báo cáo hợp đồng đã ký cho ${customer.display_name}`}>
              <FileCheck2 className="size-4" aria-hidden="true"/>
            </Button>
          )}
        </>}
        {!mineMode && customer.visible_status === 'AVAILABLE' && canRegister && (
          <Button onClick={onRegister} size="icon" variant="outline" className="size-9 rounded-lg border-green-700 text-green-800" title="Đăng ký tiếp cận" aria-label={`Đăng ký tiếp cận ${customer.display_name}`}>
            <Plus className="size-4" aria-hidden="true"/>
          </Button>
        )}
        {!mineMode && customer.visible_status === 'APPROACHING' && (
          <>
            {canAddActivity && customer.can_manage_approach && (
              <Button onClick={onActivity} size="icon" variant="outline" className="size-9 rounded-lg border-green-700 text-green-800"
                title="Cập nhật tư vấn" aria-label={`Cập nhật tư vấn ${customer.display_name}`}>
                <SquarePen className="size-4" aria-hidden="true"/>
              </Button>
            )}
            {canReportContract && customer.contract_id !== null && customer.contract_status === 'NEEDS_REVISION' && (

              <Button type="button" size="icon" variant="outline" className="size-9 rounded-lg border-amber-500 text-amber-800"

                onClick={onRevision} title="Chỉnh sửa hợp đồng theo yêu cầu Quản lý"

                aria-label={`Chỉnh sửa hợp đồng ${customer.display_name}`}>

                <FilePenLine className="size-4" aria-hidden="true"/>

              </Button>

            )}
            {canReportContract && customer.can_manage_approach && !customer.contract_id && (
              <Button onClick={onContract} size="icon" className="size-9 rounded-lg bg-[#1b5e20] hover:bg-[#124c17]"
                title="Báo hợp đồng" aria-label={`Báo hợp đồng ${customer.display_name}`}>
                <FileCheck2 className="size-4" aria-hidden="true"/>
              </Button>
            )}
          </>
        )}
        {!mineMode && customer.visible_status === 'CONTRACTED' && (
          <>
            <Badge variant="outline" className="h-8 rounded-xl px-2.5">
              {customer.reconciliation_status === 'CONFIRMED'
                ? 'Đã đối soát'
                : 'Chờ đối soát'}
            </Badge>
            {canRecordRevenue &&
              customer.can_record_revenue &&
              customer.collected_revenue < customer.contract_value && (
                <Button onClick={onReceipt} size="icon" variant="outline" className="size-9 rounded-lg border-green-700 text-green-800"
                  title="Ghi nhận thu" aria-label={`Ghi nhận thu ${customer.display_name}`}>
                  <ReceiptText className="size-4" aria-hidden="true"/>
                </Button>
              )}
          </>
        )}
      </div>
    </div>
  );
}

/** Submit a school extension request to the assigned sales manager. No automatic extension. */
function ExtensionDialog({
  customer, apiBase, token, onClose, onSubmitted,
}: {
  customer: ChannelCustomer;
  apiBase: string;
  token: string;
  onClose: () => void;
  onSubmitted: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requestKey] = useState(() => idempotencyKey('extension'));
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customer.approach_registration_id || saving) return;
    const form = new FormData(event.currentTarget);
    const reason = text(form, 'progress');
    setSaving(true);
    setError('');
    try {
      if (!reason) throw new Error('Vui lòng nhập lý do xin gia hạn.');
      await channelRequest(apiBase, token, `/approaches/${customer.approach_registration_id}/extension-requests`, {
        method: 'POST',
        body: JSON.stringify({
          idempotency_key: requestKey,
          // The CRM calculates the proposed date using the active organization policy.
          requested_until: null,
          // Manager review deadline is derived from the active policy on the server.
          review_due_at: null,
          next_appointment_at: null,
          progress: reason,
          evidence_reference: null,
        }),
      });
      await onSubmitted();
      appNotice.success('Đã gửi yêu cầu gia hạn tiếp cận.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không gửi được yêu cầu gia hạn.');
    } finally {
      setSaving(false);
    }
  };
  return <AppDialog open onOpenChange={open => {if (!open && !saving) onClose();}}
    busy={saving} title="Xin gia hạn tiếp cận"
    description="Gửi yêu cầu đến Quản lý bán hàng để phê duyệt. Yêu cầu không tự gia hạn quyền bảo vệ.">
    <form className="space-y-3" onSubmit={submit}>
      <CustomerHighlight customer={customer}/>
      <p className="text-sm text-muted-foreground">
        Bảo vệ hiện tại đến: {customer.protected_until ? channelDate(customer.protected_until) : 'Chưa có'}
        {customer.extension_max_count != null && <span className="mt-1 block">Đã được duyệt {customer.extension_approved_count ?? 0}/{customer.extension_max_count} lần gia hạn.</span>}
      </p>
      <p className="text-xs text-muted-foreground">Thời hạn đề nghị gia hạn được CRM tự tính theo chính sách đang áp dụng và chỉ có hiệu lực sau khi Quản lý duyệt.</p>
      <Field label="Lý do xin gia hạn *">
        <textarea name="progress" required maxLength={4000} rows={3} className={textareaClass}
          placeholder="Nêu kết quả tư vấn, nhu cầu của trường và lý do cần thêm thời gian."/>
      </Field>
      <DialogFooter saving={saving} error={error} onClose={onClose} label="Gửi quản lý phê duyệt"/>
    </form>
  </AppDialog>;
}

function RegisterApproachDialog({
  customer,
  onClose,
  onSubmit,
}: {
  customer: ChannelCustomer | null;
  onClose: () => void;
  onSubmit: (input: RegisterApproachInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requestKey] = useState(() => idempotencyKey('approach'));
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        idempotency_key: requestKey,
        customer_id: customer?.id,
        customer_type: (text(form, 'customer_type') || 'ORGANIZATION') as
          | 'ORGANIZATION'
          | 'INDIVIDUAL',
        display_name: customer?.display_name ?? text(form, 'display_name'),
        legal_name: text(form, 'legal_name'),
        tax_code: customer?.tax_code ?? text(form, 'tax_code'),
        phone: customer?.phone ?? text(form, 'phone'),
        email: customer?.email ?? text(form, 'email'),
        province: text(form, 'province'),
        contact_name: customer?.contact_name ?? text(form, 'contact_name'),
        contact_position: text(form, 'contact_position'),
        source: text(form, 'source'),
        note: text(form, 'note'),
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Không thể đăng ký tiếp cận.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <SalesFormDialog
      title="Đăng ký tiếp cận"
      subtitle="Quyền bảo vệ được tính 120 giờ theo thời gian máy chủ."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        {customer ? (
          <CustomerHighlight customer={customer} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loại khách hàng">
              <Select name="customer_type" defaultValue="ORGANIZATION">
                <option value="ORGANIZATION">Tổ chức / doanh nghiệp</option>
                <option value="INDIVIDUAL">Cá nhân</option>
              </Select>
            </Field>
            <Field label="Tên khách hàng *">
              <Input
                name="display_name"
                required
                className="rounded-xl"
                placeholder="Trung tâm giáo dục ABC"
              />
            </Field>
            <Field label="Tên pháp lý">
              <Input
                name="legal_name"
                className="rounded-xl"
                placeholder="Công ty TNHH…"
              />
            </Field>
            <Field label="Mã số thuế">
              <Input
                name="tax_code"
                className="rounded-xl"
                placeholder="0312345678"
              />
            </Field>
            <Field label="Số điện thoại">
              <Input
                name="phone"
                className="rounded-xl"
                placeholder="0901 234 567"
              />
            </Field>
            <Field label="Email">
              <Input
                name="email"
                type="email"
                className="rounded-xl"
                placeholder="hello@company.vn"
              />
            </Field>
            <Field label="Người liên hệ">
              <Input
                name="contact_name"
                className="rounded-xl"
                placeholder="Nguyễn Minh Anh"
              />
            </Field>
            <Field label="Chức vụ">
              <Input
                name="contact_position"
                className="rounded-xl"
                placeholder="Giám đốc"
              />
            </Field>
            <Field label="Tỉnh / thành phố">
              <Input
                name="province"
                className="rounded-xl"
                placeholder="TP. Hồ Chí Minh"
              />
            </Field>
            <Field label="Nguồn khách hàng">
              <Input
                name="source"
                className="rounded-xl"
                placeholder="Giới thiệu, sự kiện…"
              />
            </Field>
          </div>
        )}
        {customer && (
          <input type="hidden" name="source" value={customer.source ?? ''} />
        )}
        <div className="mt-4">
          <Field label="Kế hoạch tiếp cận / ghi chú">
            <textarea
              name="note"
              rows={4}
              className={textareaClass}
              placeholder="Mục tiêu cuộc gặp, nhu cầu sơ bộ, lịch hẹn…"
            />
          </Field>
        </div>
        <DialogFooter
          saving={saving}
          error={error}
          onClose={onClose}
          label="Xác lập quyền 5 ngày"
        />
      </form>
    </SalesFormDialog>
  );
}

function ActivityDialog({
  customer,
  onClose,
  onSubmit,
}: {
  customer: ChannelCustomer;
  onClose: () => void;
  onSubmit: (input: CustomerActivityInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = text(form, 'content').trim();
    if (!content) {
      setError('Vui lòng nhập nội dung trao đổi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Server records actor and timestamp; outcome stays unset instead of
      // guessing the school's level of interest from a free-form note.
      await onSubmit({ activity_type: 'NOTE', content });
      appNotice.success('Đã lưu nội dung trao đổi.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể lưu nội dung trao đổi.';
      setError(message);
      appNotice.error('Không thể lưu kết quả tư vấn.', message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <SalesFormDialog
      title="Cập nhật kết quả tư vấn"
      subtitle="Ghi nhận nội dung làm việc với nhà trường. Hoạt động không tự gia hạn quyền bảo vệ."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <CustomerHighlight customer={customer} />
        <div className="mt-4">
          <Field label="Nội dung trao đổi *">
            <textarea
              name="content"
              aria-label="Nội dung trao đổi"
              required
              maxLength={4000}
              rows={5}
              className={textareaClass}
              placeholder="Nhập nội dung đã trao đổi, phản hồi của nhà trường hoặc kế hoạch tiếp theo..."
            />
          </Field>
          <p className="mt-1 text-xs text-muted-foreground">Tối đa 4.000 ký tự.</p>
        </div>
        <DialogFooter
          saving={saving}
          error={error}
          onClose={onClose}
          label="Lưu kết quả"
        />
      </form>
    </SalesFormDialog>
  );
}

function ContractDialog({
  customer, packages, apiBase, token, onClose, onSubmit,
}: {
  customer: ChannelCustomer;
  packages: ChannelSalesWorkspace['packages'];
  apiBase?: string;
  token?: string;
  onClose: () => void;
  onSubmit: (input: ReportContractInput) => Promise<void>;
}) {
  const [plan, setPlan] = useState<'SCHOOL_YEAR' | 'MONTHLY_9'>('SCHOOL_YEAR');
  const [maintenanceFee, setMaintenanceFee] = useState('');
  const [setupFee, setSetupFee] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [units, setUnits] = useState<{id:number;name:string}[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [branchCount, setBranchCount] = useState('0');
  const [branchCountTouched, setBranchCountTouched] = useState(false);
  const [unitsError, setUnitsError] = useState('');
  const [saving, setSaving] = useState(false);
  const [signedOn, setSignedOn] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  });
  const [note, setNote] = useState('');
  const [serviceStartOn, setServiceStartOn] = useState('');
  const [serviceEndOn, setServiceEndOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<ContractErrors>({});
  const clearError = (key: ContractField) => setErrors(old => {
    if (!old[key]) return old;
    const next = { ...old }; delete next[key]; return next;
  });
  const [requestKey] = useState(() => idempotencyKey('contract'));
  const paymentCycle = paymentCycleForPlan(plan);
  const multiplier = plan === 'MONTHLY_9' ? 9 : 1;
  const maintenance = Number(maintenanceFee);
  const setup = Number(setupFee);
  const amountsValid = maintenanceFee.trim() !== '' && setupFee.trim() !== ''
    && Number.isSafeInteger(maintenance) && maintenance >= 0
    && Number.isSafeInteger(setup) && setup >= 0
    && Number.isSafeInteger(maintenance * multiplier + setup)
    && maintenance * multiplier + setup > 0;
  const total = amountsValid ? maintenance * multiplier + setup : null;
  const formatVnd = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ';

  useEffect(() => {
    if (!apiBase || !token) return;
    let mounted = true;
    void channelRequest<{data:{id:number;name:string}[]}>(apiBase, token,
      `/contract-school-units/${customer.id}`)
      .then(result => { if (mounted) setUnits(result.data); })
      .catch(() => { if (mounted) setUnitsError('Không tải được danh sách phân hiệu. Vui lòng đóng và mở lại biểu mẫu.'); });
    return () => { mounted = false; };
  }, [apiBase, token, customer.id]);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    try {
      if (!apiBase || !token) throw new Error('Cần kết nối hệ thống để upload hợp đồng.');
      if (!packages.length) throw new Error('Chưa có gói dịch vụ hoạt động. Vui lòng liên hệ Admin.');
      const issues = validateContract({
        signedOn, serviceStartOn, serviceEndOn, paymentCycle, plan, students: studentCount, branches: branchCount,
        selectedUnitCount: selectedUnitIds.length, maintenance: maintenanceFee,
        setup: setupFee, note, file, existingEvidence: false,
      });
      setErrors(issues);
      const first = Object.keys(issues)[0] as ContractField | undefined;
      if (first) {
        const field = formElement.querySelector<HTMLElement>(`[data-field="${first}"]`);
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        field?.focus({ preventScroll: true });
        return;
      }
      const latest = await channelRequest<SalesSchoolProfile>(apiBase, token, `/customers/${customer.id}`);
      if (latest.contracts.length > 0)
        throw new Error('Trường đã có hồ sơ hợp đồng. Vui lòng theo dõi hồ sơ xác minh hoặc bổ sung theo yêu cầu.');
      if (total === null || !file) return;
      setSaving(true);
      const upload = new FormData();
      upload.set('kind', 'CONTRACT');
      upload.set('file', file);
      const response = await channelRequest<{data:{id:number}}>(apiBase, token,
        '/evidence', {method: 'POST', body: upload});
      await onSubmit({
        idempotency_key: requestKey,
        signed_on: signedOn,
        service_start_on: serviceStartOn,
        service_end_on: serviceEndOn,
        payment_cycle: paymentCycle,
        product_package_id: packages[0].id,
        service_plan: plan,
        student_count: Number(studentCount),
        school_unit_ids: selectedUnitIds,
        branch_count: Number(branchCount),
        maintenance_fee: maintenance,
        setup_fee: setup,
        contract_note: note.trim() || undefined,
        total_value: total,
        evidence_id: response.data.id,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không thể báo cáo hợp đồng.';
      appNotice.error('Không thể gửi hợp đồng xác minh.', message);
    } finally { setSaving(false); }
  };

  return <SalesFormDialog title="Báo cáo hợp đồng"
    subtitle="Nhập chi phí theo hợp đồng đã ký. CHECKEE sẽ xác minh hồ sơ và giá trị thực tế."
    onClose={onClose}>
    <form onSubmit={submit} noValidate>
      <CustomerHighlight customer={customer}/>
      <div className="mt-4 space-y-4">
        <Field label="Ngày ký hợp đồng *">
          <Input name="signed_on" type="date" data-field="signed_on" aria-invalid={!!errors.signed_on} value={signedOn} onChange={e=>{setSignedOn(e.target.value);clearError("signed_on");}}/>
          {errors.signed_on && <p role="alert" className="text-xs text-red-700">{errors.signed_on}</p>}
        </Field>
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-2 text-sm font-semibold">Thời hạn sử dụng theo hợp đồng *</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ngày bắt đầu dịch vụ *">
              <Input type="date" data-field="service_start_on" value={serviceStartOn}
                aria-invalid={!!errors.service_start_on} onChange={e=>{
                  setServiceStartOn(e.target.value);clearError('service_start_on');
                  if(!serviceEndOn && e.target.value){
                    const date = new Date(e.target.value+'T00:00:00Z');
                    date.setUTCFullYear(date.getUTCFullYear()+1);
                    date.setUTCDate(date.getUTCDate()-1);
                    setServiceEndOn(date.toISOString().slice(0,10));
                  }
                }}/>
              {errors.service_start_on&&<p role="alert" className="text-xs text-red-700">{errors.service_start_on}</p>}
            </Field>
            <Field label="Ngày kết thúc dịch vụ *">
              <Input type="date" data-field="service_end_on" value={serviceEndOn}
                aria-invalid={!!errors.service_end_on} onChange={e=>{setServiceEndOn(e.target.value);clearError('service_end_on');}}/>
              {errors.service_end_on&&<p role="alert" className="text-xs text-red-700">{errors.service_end_on}</p>}
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">Ngày kết thúc gợi ý sau một năm; vui lòng đối chiếu ngày thực tế trên hợp đồng. CHECKEE sẽ xác minh trước khi kỳ dịch vụ có hiệu lực.</p>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Gói dịch vụ & hình thức thanh toán *</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="service_plan_choice" value="SCHOOL_YEAR"
              checked={plan==='SCHOOL_YEAR'} onChange={()=>{setPlan('SCHOOL_YEAR');clearError('service_plan');}}/>
            Gói năm học (9 tháng, tặng 3 tháng hè)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="service_plan_choice" value="MONTHLY_9"
              checked={plan==='MONTHLY_9'} onChange={()=>{setPlan('MONTHLY_9');clearError('service_plan');}}/>
            Gói hàng tháng (9 tháng)
          </label>
          {errors.service_plan && <p role="alert" className="text-xs text-red-700">{errors.service_plan}</p>}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Quy mô học sinh *">
            <Input aria-label="Quy mô học sinh" data-field="student_count" aria-invalid={!!errors.student_count} type="number" min={1} max={100000}
              value={studentCount} onChange={e=>{setStudentCount(e.target.value);clearError("student_count");}}
              placeholder="Ví dụ: 450"/>
            {errors.student_count && <p role="alert" className="text-xs text-red-700">{errors.student_count}</p>}
          </Field>
          <Field label="Số phân hiệu triển khai">
            <Input aria-label="Số phân hiệu triển khai" data-field="branch_count" aria-invalid={!!errors.branch_count} type="number" inputMode="numeric" min={0} max={100000}
              value={branchCount} onChange={e=>{setBranchCount(e.target.value);setBranchCountTouched(true);clearError("branch_count");}}/>
            {errors.branch_count && <p role="alert" className="text-xs text-red-700">{errors.branch_count}</p>}
          </Field>
        </div>
        {units.length>0 && <fieldset className="rounded-xl border p-3">
          <legend className="px-1 text-sm font-semibold">Chọn phân hiệu triển khai</legend>
          <div className="space-y-2">{units.map(unit => <label key={unit.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selectedUnitIds.includes(unit.id)}
              onChange={e=>{
                const next = e.target.checked
                  ? [...selectedUnitIds,unit.id]
                  : selectedUnitIds.filter(id=>id!==unit.id);
                setSelectedUnitIds(next);
                if (!branchCountTouched || Number(branchCount) < next.length) setBranchCount(String(next.length));
                clearError('branch_count');
              }}/>
            {unit.name}
          </label>)}</div>
        </fieldset>}
        {unitsError && <output className="block text-sm text-muted-foreground">Chưa tải được danh sách phân hiệu; vẫn có thể nhập số phân hiệu theo hợp đồng.</output>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={plan==='MONTHLY_9'?'Phí duy trì mỗi tháng (VNĐ) *':'Phí duy trì 9 tháng (VNĐ) *'}>
            <AppCurrencyInput aria-label="Phí duy trì" data-field="maintenance_fee" aria-invalid={!!errors.maintenance_fee}
              value={maintenanceFee} onValueChange={v=>{setMaintenanceFee(v);clearError("maintenance_fee");clearError("total_value");}} placeholder="Ví dụ: 1.000.000"/>
            {errors.maintenance_fee && <p role="alert" className="text-xs text-red-700">{errors.maintenance_fee}</p>}
          </Field>
          <Field label="Phí khởi tạo (VNĐ) *">
            <AppCurrencyInput aria-label="Phí khởi tạo" data-field="setup_fee" aria-invalid={!!errors.setup_fee}
              value={setupFee} onValueChange={v=>{setSetupFee(v);clearError("setup_fee");clearError("total_value");}} placeholder="Ví dụ: 2.000.000"/>
            {errors.setup_fee && <p role="alert" className="text-xs text-red-700">{errors.setup_fee}</p>}
          </Field>
        </div>
        <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
          <h3 className="font-semibold">Chi phí theo hợp đồng</h3>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>{plan==='MONTHLY_9'?'Phí duy trì (9 tháng)':'Phí duy trì (9 tháng)'}</span>
            <span className="tabular-nums">{Number.isSafeInteger(maintenance*multiplier) && maintenanceFee ? formatVnd(maintenance*multiplier) : '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>Phí khởi tạo (một lần)</span>
            <span className="tabular-nums">{setupFee && Number.isSafeInteger(setup) ? formatVnd(setup) : '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <strong>Tổng giá trị hợp đồng</strong>
            <strong className="text-lg tabular-nums text-emerald-700 dark:text-emerald-300">
              {total===null ? '—' : formatVnd(total)}
            </strong>
          </div>
          {errors.total_value && <p role="alert" className="text-xs text-red-700">{errors.total_value}</p>}
        </div>
        <Field label="Ghi chú hợp đồng (không bắt buộc)">
          <textarea name="contract_note" data-field="contract_note" aria-label="Ghi chú hợp đồng"
            aria-invalid={!!errors.contract_note} value={note} onChange={e=>{setNote(e.target.value);clearError("contract_note");}}
            maxLength={4000} rows={3} className={textareaClass}
            placeholder="Nhập thông tin cần xác minh thêm (nếu có)..."/>
          {errors.contract_note && <p role="alert" className="text-xs text-red-700">{errors.contract_note}</p>}
        </Field>
        <div>
          <Field label="File hợp đồng đã ký *">
            <Input name="contract_file" data-field="contract_file" aria-invalid={!!errors.contract_file} type="file"
              accept=".pdf,image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0] ?? null);clearError("contract_file");}}/>
            {errors.contract_file && <p role="alert" className="text-xs text-red-700">{errors.contract_file}</p>}
          </Field>
          <p className="mt-1 text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · Tối đa 5 MB.</p>
        </div>
      </div>
      <DialogFooter saving={saving} error="" onClose={onClose} label="Gửi hợp đồng xác minh"/>
    </form>
  </SalesFormDialog>;
}

function ReceiptDialog({
  customer,
  apiBase,
  token,
  onClose,
  onSubmit,
}: {
  customer: ChannelCustomer;
  apiBase?: string;
  token?: string;
  onClose: () => void;
  onSubmit: (input: RevenueReceiptInput) => Promise<void>;
}) {
  const remaining = customer.contract_value - customer.collected_revenue;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requestKey] = useState(() => idempotencyKey('receipt'));
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      if (!apiBase || !token || customer.contract_id === null)
        throw new Error('Chưa kết nối API hợp đồng để upload chứng từ.');
      const file = form.get('proof');
      if (!(file instanceof File) || file.size <= 0)
        throw new Error('Bắt buộc upload ảnh chứng từ khoản thu.');
      const upload = new FormData();
      upload.set('kind', 'RECEIPT');
      upload.set('contract_id', String(customer.contract_id));
      upload.set('file', file);
      const result = await channelRequest<{data:{id:number}}>(apiBase, token, '/evidence', {
        method: 'POST', body: upload,
      });
      await onSubmit({
        evidence_id: result.data.id,
        idempotency_key: requestKey,
        amount: Number(text(form, 'amount')),
        received_at: new Date(text(form, 'received_at')).toISOString(),
        reference_code: text(form, 'reference_code'),
        payment_method: text(
          form,
          'payment_method',
        ) as RevenueReceiptInput['payment_method'],
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Không thể ghi nhận khoản thu.',
      );
    } finally {
      setSaving(false);
    }
  };
  const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return (
    <SalesFormDialog
      title="Ghi nhận doanh thu"
      subtitle="Hoa hồng chỉ phát sinh từ khoản thực thu theo chính sách đang hiệu lực."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <CustomerHighlight customer={customer} />
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/25">
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            Còn phải thu
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-800 dark:text-emerald-200">
            {money(remaining)}
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Số tiền thu *">
            <Input
              name="amount"
              type="number"
              min={1}
              max={remaining}
              required
              defaultValue={remaining}
              className="rounded-xl"
            />
          </Field>
          <Field label="Mã phiếu thu *">
            <Input
              name="reference_code"
              required
              className="rounded-xl"
              placeholder="RC-2026-0002"
            />
          </Field>
          <Field label="Thời điểm thu *">
            <Input
              name="received_at"
              type="datetime-local"
              required
              defaultValue={localNow}
              className="rounded-xl"
            />
          </Field>
          <Field label="Phương thức">
            <Select name="payment_method" defaultValue="BANK_TRANSFER">
              <option value="BANK_TRANSFER">Chuyển khoản</option>
              <option value="CASH">Tiền mặt</option>
              <option value="CARD">Thẻ</option>
              <option value="OTHER">Khác</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Ảnh chứng từ nhà trường chuyển tiền *">
            <Input name="proof" type="file" accept="image/jpeg,image/png,image/webp" required/>
          </Field>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP · tối đa 5 MB · chỉ tài khoản được phân quyền có thể xem.</p>
        </div>
        <DialogFooter
          saving={saving}
          error={error}
          onClose={onClose}
          label="Xác nhận khoản thu"
        />
      </form>
    </SalesFormDialog>
  );
}

function SalesFormDialog({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AppDialog open onOpenChange={(open) => { if (!open) onClose(); }} title={title} description={subtitle}>
      {children}
    </AppDialog>
  );}

function DialogFooter({
  saving,
  error,
  onClose,
  label,
}: {
  saving: boolean;
  error: string;
  onClose: () => void;
  label: string;
}) {
  return (
    <>
      {error && (
        <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-xl"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#1b5e20] hover:bg-[#124c17]"
        >
          {saving ? 'Đang lưu…' : label}
        </Button>
      </div>
    </>
  );
}

function CustomerHighlight({ customer }: { customer: ChannelCustomer }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/55 p-4">
      <div className="grid size-11 place-items-center rounded-2xl bg-[#e8f5e9] text-[#1b5e20]">
        <Building2 className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{customer.display_name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {customer.tax_code ? `MST ${customer.tax_code}` : customer.code}
          {customer.phone ? ` · ${customer.phone}` : ''}
        </p>
      </div>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-slate-300 [&_svg]:size-4">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold tracking-[-0.02em]">{value}</p>
    </div>
  );
}

function StatusSummary({
  icon,
  label,
  value,
  caption,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  caption: string;
  tone: 'slate' | 'amber' | 'emerald';
}) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    emerald:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  };
  return (
    <Card className="border-0 shadow-sm ring-1 ring-border/80">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`grid size-11 place-items-center rounded-2xl [&_svg]:size-5 ${colors[tone]}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="text-2xl font-bold">{value}</p>
            <p className="truncate pb-1 text-[11px] text-muted-foreground">
              {caption}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-1.5 text-sm font-medium">
      <legend className="text-sm font-medium">{label}</legend>
      {children}
    </fieldset>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring ${props.className ?? ''}`}
    />
  );
}

const textareaClass =
  'w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring';
const text = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

/** Visual urgency only. The server remains responsible for expiry and ownership. */
function protectionUrgency(value: string): 'warning' | 'critical' | null {
  const remaining = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0 || remaining > 24 * 3600000) return null;
  return remaining <= 6 * 3600000 ? 'critical' : 'warning';
}

function timeRemaining(value: string) {
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return 'Đã hết thời hạn';
  const hours = Math.ceil(milliseconds / 3600000);
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return days > 0 ? `Còn ${days} ngày ${rest} giờ` : `Còn ${hours} giờ`;
}
