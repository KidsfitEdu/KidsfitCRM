'use client';

import { useMemo, useState, type ReactNode, type SyntheticEvent } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FileCheck2,
  Handshake,
  Landmark,
  Phone,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog as UiDialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { channelDate } from '@/lib/channel-operations';
import type {
  ChannelCustomer,
  ChannelSalesWorkspace,
  CustomerActivityInput,
  RegisterApproachInput,
  ReportContractInput,
  RevenueReceiptInput,
} from '@/lib/channel-sales';

type StatusFilter = 'ALL' | ChannelCustomer['visible_status'];

type Props = {
  onOpenCustomer?: (id: number) => void;
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
  onOpenCustomer,
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
  const [registerCustomer, setRegisterCustomer] = useState<
    ChannelCustomer | null | undefined
  >(undefined);
  const [activityCustomer, setActivityCustomer] =
    useState<ChannelCustomer | null>(null);
  const [contractCustomer, setContractCustomer] =
    useState<ChannelCustomer | null>(null);
  const [receiptCustomer, setReceiptCustomer] =
    useState<ChannelCustomer | null>(null);

  const customers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('vi');
    return workspace.data.filter(
      (customer) =>
        (filter === 'ALL' || customer.visible_status === filter) &&
        (!term ||
          [
            customer.display_name,
            customer.code,
            customer.phone,
            customer.tax_code,
            customer.contact_name,
          ].some((value) => value?.toLocaleLowerCase('vi').includes(term))),
    );
  }, [filter, search, workspace.data]);

  const tabs: { id: StatusFilter; label: string; count: number }[] = [
    {
      id: 'ALL',
      label: 'Tất cả',
      count:
        workspace.metrics.available +
        workspace.metrics.approaching +
        workspace.metrics.contracted,
    },
    {
      id: 'AVAILABLE',
      label: 'Chưa đăng ký',
      count: workspace.metrics.available,
    },
    {
      id: 'APPROACHING',
      label: 'Đang tiếp cận',
      count: workspace.metrics.approaching,
    },
    {
      id: 'CONTRACTED',
      label: 'Đã ký',
      count: workspace.metrics.contracted,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#111d31] px-6 py-7 text-white shadow-[0_26px_70px_rgba(17,29,49,.2)] sm:px-8">
        <div className="absolute -right-20 -top-36 size-80 rounded-full bg-[#8172ef]/35 blur-3xl" />
        <div className="absolute -bottom-44 left-1/3 size-80 rounded-full bg-[#20b895]/20 blur-3xl" />
        <div className="relative grid gap-7 xl:grid-cols-[1.25fr_.75fr] xl:items-end">
          <div>
            <Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10">
              <ShieldCheck className="mr-1 size-3.5" /> Customer protection
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
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
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
      </section>

      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/80">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
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
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-xl bg-background pl-9"
                placeholder="Tên, MST, điện thoại…"
              />
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(230px,1.45fr)_minmax(160px,.8fr)_minmax(170px,.9fr)_minmax(150px,.7fr)_auto] gap-4 border-b bg-muted/35 px-5 py-3 text-[11px] font-semibold uppercase tracking-[.08em] text-muted-foreground xl:grid">
            <span>Khách hàng</span>
            <span>Trạng thái</span>
            <span>Quyền bảo vệ</span>
            <span>Tài chính</span>
            <span className="text-right">Thao tác</span>
          </div>
          <div className="divide-y divide-border/70">
            {customers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                onOpenDetail={
                  onOpenCustomer ? () => onOpenCustomer(customer.id) : undefined
                }
                canSeeRevenue={workspace.capabilities?.view_revenue !== false}
                canRegister={canRegister}
                canAddActivity={canAddActivity}
                canReportContract={canReportContract}
                canRecordRevenue={canRecordRevenue}
                onRegister={() => setRegisterCustomer(customer)}
                onActivity={() => setActivityCustomer(customer)}
                onContract={() => setContractCustomer(customer)}
                onReceipt={() => setReceiptCustomer(customer)}
              />
            ))}
            {customers.length === 0 && (
              <div className="grid min-h-60 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                    <Search className="size-5" />
                  </div>
                  <p className="mt-4 font-semibold">Chưa tìm thấy khách hàng</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Thử từ khóa khác hoặc tạo lượt tiếp cận mới.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
      {contractCustomer && (
        <ContractDialog
          customer={contractCustomer}
          packages={workspace.packages}
          onClose={() => setContractCustomer(null)}
          onSubmit={async (input) => {
            await onReportContract(contractCustomer, input);
            setContractCustomer(null);
          }}
        />
      )}
      {receiptCustomer && (
        <ReceiptDialog
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
  onReceipt,
}: {
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
  onReceipt: () => void;
}) {
  const status = statusCopy[customer.visible_status];
  return (
    <div className="grid gap-4 px-4 py-5 transition-colors hover:bg-muted/25 sm:px-5 xl:grid-cols-[minmax(230px,1.45fr)_minmax(160px,.8fr)_minmax(170px,.9fr)_minmax(150px,.7fr)_auto] xl:items-center">
      <div className="flex min-w-0 gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ebe8ff] text-[#6558d3] dark:bg-[#6558d3]/20">
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
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {customer.tax_code ? `MST ${customer.tax_code}` : customer.code}
            {customer.contact_name ? ` · ${customer.contact_name}` : ''}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground xl:hidden">
            <Phone className="size-3" />{' '}
            {customer.phone ?? 'Chưa có số điện thoại'}
          </p>
        </div>
      </div>
      <div>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {status.compact}
        </p>
      </div>
      <div className="text-sm">
        {customer.protected_until ? (
          <>
            <p className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="size-4 text-[#6558d3]" />
              {customer.owner_user_name ?? 'Đã xác lập quyền'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {customer.visible_status === 'APPROACHING'
                ? timeRemaining(customer.protected_until)
                : `Đến ${channelDate(customer.protected_until)}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có quyền bảo vệ</p>
        )}
      </div>
      <div className="text-sm">
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
      </div>
      <div className="flex flex-wrap justify-end gap-2 xl:min-w-44">
        {customer.visible_status === 'AVAILABLE' && canRegister && (
          <Button onClick={onRegister} size="sm" className="rounded-xl">
            Đăng ký <ArrowRight />
          </Button>
        )}
        {customer.visible_status === 'APPROACHING' && (
          <>
            {canAddActivity && customer.can_manage_approach && (
              <Button
                onClick={onActivity}
                size="sm"
                variant="outline"
                className="rounded-xl"
              >
                Cập nhật
              </Button>
            )}
            {canReportContract && customer.can_manage_approach && (
              <Button
                onClick={onContract}
                size="sm"
                className="rounded-xl bg-[#6558d3] hover:bg-[#594cc8]"
              >
                Báo hợp đồng
              </Button>
            )}
          </>
        )}
        {customer.visible_status === 'CONTRACTED' && (
          <>
            <Badge variant="outline" className="h-8 rounded-xl px-2.5">
              {customer.reconciliation_status === 'CONFIRMED'
                ? 'Đã đối soát'
                : 'Chờ đối soát'}
            </Badge>
            {canRecordRevenue &&
              customer.can_record_revenue &&
              customer.collected_revenue < customer.contract_value && (
                <Button
                  onClick={onReceipt}
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                >
                  <ReceiptText /> Ghi nhận thu
                </Button>
              )}
          </>
        )}
      </div>
    </div>
  );
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
    <Dialog
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
    </Dialog>
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
    setSaving(true);
    setError('');
    try {
      const next = text(form, 'next_follow_up_at');
      await onSubmit({
        activity_type: text(
          form,
          'activity_type',
        ) as CustomerActivityInput['activity_type'],
        content: text(form, 'content'),
        next_follow_up_at: next ? new Date(next).toISOString() : undefined,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Không thể lưu hoạt động.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      title="Cập nhật tiếp cận"
      subtitle="Hoạt động không tự động gia hạn quyền bảo vệ."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <CustomerHighlight customer={customer} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Loại hoạt động">
            <Select name="activity_type" defaultValue="CALL">
              <option value="CALL">Cuộc gọi</option>
              <option value="MEETING">Cuộc gặp</option>
              <option value="PROPOSAL">Gửi đề xuất</option>
              <option value="NOTE">Ghi chú</option>
            </Select>
          </Field>
          <Field label="Lịch theo dõi tiếp theo">
            <Input
              name="next_follow_up_at"
              type="datetime-local"
              className="rounded-xl"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Kết quả / ghi chú *">
              <textarea
                name="content"
                required
                rows={4}
                className={textareaClass}
                placeholder="Nội dung trao đổi, phản hồi và bước tiếp theo…"
              />
            </Field>
          </div>
        </div>
        <DialogFooter
          saving={saving}
          error={error}
          onClose={onClose}
          label="Lưu hoạt động"
        />
      </form>
    </Dialog>
  );
}

function ContractDialog({
  customer,
  packages,
  onClose,
  onSubmit,
}: {
  customer: ChannelCustomer;
  packages: ChannelSalesWorkspace['packages'];
  onClose: () => void;
  onSubmit: (input: ReportContractInput) => Promise<void>;
}) {
  const [packageId, setPackageId] = useState(packages[0]?.id ?? 0);
  const selectedPackage = packages.find((item) => item.id === packageId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [requestKey] = useState(() => idempotencyKey('contract'));
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        idempotency_key: requestKey,
        contract_code: text(form, 'contract_code'),
        signed_on: text(form, 'signed_on'),
        product_package_id: Number(text(form, 'product_package_id')),
        total_value: Number(text(form, 'total_value')),
        first_payment_due_on: text(form, 'first_payment_due_on') || undefined,
        evidence_reference: text(form, 'evidence_reference'),
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Không thể báo cáo hợp đồng.',
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      title="Báo cáo hợp đồng"
      subtitle="Hồ sơ trường học cần quản lý kiểm tra, CHECKEE xác minh và KIDSFIT ghi nhận trước khi được bảo vệ 5 năm."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <CustomerHighlight customer={customer} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Mã hợp đồng *">
            <Input
              name="contract_code"
              required
              className="rounded-xl"
              placeholder="CHK-2026-0002"
            />
          </Field>
          <Field label="Ngày ký *">
            <Input
              name="signed_on"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-xl"
            />
          </Field>
          <Field label="Gói CHECKEE *">
            <Select
              name="product_package_id"
              value={packageId}
              onChange={(event) => setPackageId(Number(event.target.value))}
            >
              {packages.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Giá trị hợp đồng *">
            <Input
              key={packageId}
              name="total_value"
              type="number"
              min={1}
              required
              defaultValue={selectedPackage?.list_price ?? 0}
              className="rounded-xl"
            />
          </Field>
          <Field label="Hạn thanh toán đầu tiên">
            <Input
              name="first_payment_due_on"
              type="date"
              className="rounded-xl"
            />
          </Field>
          <Field label="Tham chiếu bằng chứng">
            <Input
              name="evidence_reference"
              className="rounded-xl"
              placeholder="Số biên bản / đường dẫn nội bộ"
            />
          </Field>
        </div>
        <DialogFooter
          saving={saving}
          error={error}
          onClose={onClose}
          label="Gửi báo cáo hợp đồng"
        />
      </form>
    </Dialog>
  );
}

function ReceiptDialog({
  customer,
  onClose,
  onSubmit,
}: {
  customer: ChannelCustomer;
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
      await onSubmit({
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
    <Dialog
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
        <DialogFooter
          saving={saving}
          error={error}
          onClose={onClose}
          label="Xác nhận khoản thu"
        />
      </form>
    </Dialog>
  );
}

function Dialog({
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
    <UiDialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[26px] bg-card p-5 text-card-foreground shadow-2xl sm:max-w-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-xl font-bold tracking-[-0.03em]">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
              {subtitle}
            </DialogDescription>
          </div>
        </div>
        {children}
      </DialogContent>
    </UiDialog>
  );
}

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
          className="rounded-xl bg-[#6558d3] hover:bg-[#594cc8]"
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
      <div className="grid size-11 place-items-center rounded-2xl bg-[#e9e6ff] text-[#6558d3]">
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
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
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

function timeRemaining(value: string) {
  const milliseconds = new Date(value).getTime() - Date.now();
  if (milliseconds <= 0) return 'Đã hết thời hạn';
  const hours = Math.ceil(milliseconds / 3600000);
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return days > 0 ? `Còn ${days} ngày ${rest} giờ` : `Còn ${hours} giờ`;
}
