'use client';

import { useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SchoolDirectory } from './school-directory';
import { EvidenceReference, SchoolOperations } from './school-operations';
import { SchoolActionForm } from './school-action-form';
import {
  BadgeCheck,
  ClipboardList,
  Building2,
  Check,
  ChevronRight,
  FileCheck2,
  History,
  Plus,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  channelDate,
  channelMoney as money,
  channelQueryKeys as keys,
  channelRequest,
  currentBusinessPeriod,
  type FinanceWorkspace,
  type ReconciliationItem,
  type ChannelManagement,
  type ChannelCustomerDetail,
} from '@/lib/channel-operations';

type Props = {
  apiBase: string;
  token: string;
  abilities: string[];
  customerView: (onOpenCustomer?: (id: number) => void) => ReactNode;
  onChanged: () => Promise<void>;
};
type Panel =
  | 'customers'
  | 'schools'
  | 'operations'
  | 'reconciliation'
  | 'finance'
  | 'team';
type Command = { path: string; body?: unknown; method?: string };

export function ChannelOperations(props: Props) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <OperationsContent {...props} />
    </QueryClientProvider>
  );
}

function OperationsContent({
  apiBase,
  token,
  abilities,
  customerView,
  onChanged,
}: Props) {
  const [panel, setPanel] = useState<Panel>('customers');
  const [period, setPeriod] = useState(currentBusinessPeriod);
  const [modal, setModal] = useState<ReactNode>(null);
  const [notice, setNotice] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const client = useQueryClient();
  const can = (permission: string) => abilities.includes(permission);
  const connected = !!apiBase && !!token;
  const api = <T,>(path: string, options?: RequestInit) =>
    channelRequest<T>(apiBase, token, path, options);
  const finance = useQuery({
    queryKey: keys.finance(period),
    queryFn: () => api<FinanceWorkspace>(`/finance?period=${period}`),
    enabled:
      connected && panel === 'finance' && can('channel_sales.commission.view'),
  });
  const reconciliation = useQuery({
    queryKey: keys.reconciliation,
    queryFn: () =>
      api<{ data: ReconciliationItem[]; total: number }>(
        '/reconciliation-cases',
      ),
    enabled: connected && panel === 'reconciliation',
  });
  const management = useQuery({
    queryKey: keys.management,
    queryFn: () => api<ChannelManagement>('/management'),
    enabled: connected && panel === 'team' && can('channel_sales.team.manage'),
  });
  const detail = useQuery({
    queryKey: keys.detail(customerId),
    queryFn: () => api<ChannelCustomerDetail>(`/customers/${customerId}`),
    enabled: connected && customerId !== null,
  });
  const mutation = useMutation({
    mutationFn: (command: Command) =>
      api(command.path, {
        method: command.method ?? 'POST',
        body:
          command.body === undefined ? undefined : JSON.stringify(command.body),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.all });
      await onChanged();
      setNotice('Đã cập nhật dữ liệu.');
    },
  });
  const run = async (command: Command) => {
    await mutation.mutateAsync(command);
  };
  const tabs = [
    {
      id: 'operations' as Panel,
      label: 'Vận hành',
      icon: ClipboardList,
      show: true,
    },
    {
      id: 'schools' as Panel,
      label: 'Trường học',
      icon: Building2,
      show: connected || !apiBase,
    },
    {
      id: 'customers' as Panel,
      label: 'Khách hàng',
      icon: Building2,
      show: true,
    },
    {
      id: 'reconciliation' as Panel,
      label: 'Đối soát CHECKEE',
      icon: ShieldCheck,
      show: connected,
    },
    {
      id: 'finance' as Panel,
      label: 'Doanh thu & thu nhập',
      icon: WalletCards,
      show: connected && can('channel_sales.commission.view'),
    },
    {
      id: 'team' as Panel,
      label: 'Đội ngũ & CTV',
      icon: UsersRound,
      show: connected && can('channel_sales.team.manage'),
    },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Chức năng CHECKEE"
          className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border bg-card p-1.5 shadow-sm"
        >
          {tabs
            .filter((tab) => tab.show)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setPanel(tab.id);
                  setNotice('');
                  mutation.reset();
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${panel === tab.id ? 'bg-[#6558d3] text-white shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
        </nav>
        {panel !== 'customers' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => client.invalidateQueries({ queryKey: keys.all })}
          >
            <RefreshCw className="size-4" /> Làm mới
          </Button>
        )}
      </div>
      {notice && (
        <output className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Check className="size-4" />
          {notice}
        </output>
      )}
      {mutation.error && <ErrorBox message={mutation.error.message} />}
      {panel === 'customers' &&
        customerView(connected ? setCustomerId : undefined)}
      {panel === 'schools' && (
        <SchoolDirectory
          apiBase={apiBase}
          token={token}
          abilities={abilities}
          onChanged={onChanged}
        />
      )}
      {panel === 'operations' && (
        <SchoolOperations
          apiBase={apiBase}
          token={token}
          abilities={abilities}
          onChanged={onChanged}
        />
      )}
      {panel === 'reconciliation' && (
        <>
          <PanelHeading
            title="Đối soát quyền khách hàng"
            description="Kiểm tra hợp đồng, xác nhận quyền bảo vệ và lưu lịch sử xử lý tranh chấp."
          />
          {reconciliation.isPending ? (
            <Loading />
          ) : reconciliation.error ? (
            <ErrorBox message={reconciliation.error.message} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {reconciliation.data?.data.map((item) => (
                <section
                  key={item.id}
                  className="rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.customer_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.contract_code} · MST {item.tax_code ?? 'Chưa có'}
                      </p>
                    </div>
                    <StateBadge value={item.status} />
                  </div>
                  <div className="my-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 text-sm">
                    <Info
                      label="Giá trị hợp đồng"
                      value={money(item.total_value)}
                    />
                    <Info label="Nhân sự phụ trách" value={item.owner_name} />
                    <Info label="Ngày ký" value={channelDate(item.signed_on)} />
                    <Info
                      label="Bảo vệ dài hạn đến"
                      value={
                        item.protection_until
                          ? channelDate(item.protection_until)
                          : 'Chưa ghi nhận'
                      }
                    />
                  </div>
                  {item.dispute_reason && (
                    <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      {item.dispute_reason}
                    </p>
                  )}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">
                      <History className="mr-1 inline size-4" /> Lịch sử (
                      {item.events.length})
                    </summary>
                    <ol className="mt-3 space-y-2 border-l pl-4">
                      {item.events.map((event) => (
                        <li key={event.id}>
                          <span className="font-medium">
                            {eventCopy[event.event_type] ?? event.event_type}
                          </span>{' '}
                          · {channelDate(event.created_at)}
                          {event.reason && (
                            <p className="text-muted-foreground">
                              {event.reason}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  </details>
                  {item.can_reconcile &&
                    (item.status === 'PENDING' ||
                      item.status === 'DISPUTED') && (
                      <div className="mt-5 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          disabled={mutation.isPending}
                          onClick={() =>
                            setModal(
                              <ReasonForm
                                title="Mở tranh chấp"
                                description={item.customer_name}
                                label="Lý do tranh chấp"
                                onSubmit={async (reason) => {
                                  await run({
                                    path: `/reconciliation-cases/${item.id}/dispute`,
                                    body: { reason },
                                  });
                                  setModal(null);
                                }}
                              />,
                            )
                          }
                        >
                          Tranh chấp
                        </Button>
                        <Button
                          disabled={mutation.isPending}
                          onClick={() => {
                            run({
                              path: `/reconciliation-cases/${item.id}/confirm`,
                              body: {
                                reason: 'Đã kiểm tra hồ sơ và quyền bảo vệ.',
                              },
                            }).catch(() => undefined);
                          }}
                        >
                          <BadgeCheck /> Xác nhận
                        </Button>
                      </div>
                    )}
                </section>
              ))}
              {reconciliation.data?.data.length === 0 && (
                <Empty message="Chưa có hồ sơ đối soát trong phạm vi của bạn." />
              )}
            </div>
          )}
        </>
      )}
      {panel === 'finance' && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <PanelHeading
              title="Doanh thu & thu nhập"
              description="Hoa hồng theo kỳ phát sinh; thực lãnh theo tháng đã ghi nhận chi, múi giờ Việt Nam."
            />
            <label
              htmlFor="channel-finance-period"
              className="grid gap-1 text-xs text-muted-foreground"
            >
              Kỳ theo dõi
              <Input
                id="channel-finance-period"
                type="month"
                value={period}
                onChange={(event) => {
                  if (event.target.value) setPeriod(event.target.value);
                }}
                className="w-44 bg-card"
              />
            </label>
          </div>
          {finance.isPending ? (
            <Loading />
          ) : finance.error ? (
            <ErrorBox message={finance.error.message} />
          ) : (
            finance.data && (
              <FinancePanel
                data={finance.data}
                can={can}
                run={run}
                pending={mutation.isPending}
                showModal={setModal}
                closeModal={() => setModal(null)}
              />
            )
          )}
        </>
      )}
      {panel === 'team' && (
        <>
          <div className="flex items-center justify-between gap-4">
            <PanelHeading
              title="Đội ngũ & cộng tác viên"
              description="Quản lý tài khoản và phạm vi hoạt động của từng tổ chức."
            />
            {management.data && (
              <Button
                onClick={() =>
                  setModal(
                    <AccountForm
                      data={management.data!}
                      onSubmit={async (body) => {
                        await run({ path: '/team', body });
                        setModal(null);
                      }}
                    />,
                  )
                }
              >
                <Plus /> Cấp tài khoản
              </Button>
            )}
          </div>
          {management.isPending ? (
            <Loading />
          ) : management.error ? (
            <ErrorBox message={management.error.message} />
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-card">
              <div className="divide-y">
                {management.data?.team.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-4 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {member.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {member.email} · {member.organization_name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {management.data?.roles.find(
                            (role) => role.code === member.membership_type,
                          )?.name ??
                            roleCopy[member.membership_type] ??
                            member.membership_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StateBadge value={member.status} />
                      {member.can_change_status && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() => {
                            if (member.status === 'ACTIVE') {
                              setModal(
                                <SchoolActionForm
                                  action={{
                                    title: 'Bàn giao và ngưng thành viên',
                                    description:
                                      'Thu hồi quyền chưa ký, giữ hợp đồng và hoa hồng hợp lệ.',
                                    path: '/team/' + member.id + '/status',
                                    method: 'PATCH',
                                    preset: { status: 'SUSPENDED' },
                                    danger: true,
                                    fields: [
                                      {
                                        name: 'reason',
                                        label: 'Lý do ngưng hoạt động',
                                        type: 'textarea',
                                      },
                                      {
                                        name: 'summary',
                                        label:
                                          'Lịch hẹn, cam kết và nội dung bàn giao',
                                        type: 'textarea',
                                      },
                                    ],
                                  }}
                                  save={async (command) => {
                                    await run(command);
                                    setModal(null);
                                  }}
                                />,
                              );
                              return;
                            }
                            run({
                              path: `/team/${member.id}/status`,
                              method: 'PATCH',
                              body: {
                                status:
                                  member.status === 'ACTIVE'
                                    ? 'SUSPENDED'
                                    : 'ACTIVE',
                              },
                            }).catch(() => undefined);
                          }}
                        >
                          {member.status === 'ACTIVE'
                            ? 'Tạm ngưng'
                            : 'Kích hoạt'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <Dialog
        open={customerId !== null}
        onOpenChange={(open) => !open && setCustomerId(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogTitle>
            {detail.data?.data.display_name ?? 'Hồ sơ khách hàng'}
          </DialogTitle>
          <DialogDescription>
            Thông tin hợp đồng, lịch sử tiếp cận và chăm sóc trong phạm vi được
            cấp.
          </DialogDescription>
          {detail.isPending ? (
            <Loading />
          ) : detail.error ? (
            <ErrorBox message={detail.error.message} />
          ) : (
            detail.data && (
              <>
                <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4">
                  <Info
                    label="Mã số thuế"
                    value={detail.data.data.tax_code ?? '—'}
                  />
                  <Info
                    label="Người liên hệ"
                    value={detail.data.data.contact_name ?? '—'}
                  />
                  <Info
                    label="Điện thoại"
                    value={detail.data.data.phone ?? '—'}
                  />
                  <Info label="Email" value={detail.data.data.email ?? '—'} />
                </div>
                {detail.data.contracts.map((contract) => (
                  <div key={contract.id} className="rounded-xl border p-4">
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold">{contract.contract_code}</p>
                      {contract.total_value !== null && (
                        <p className="font-semibold">
                          {money(contract.total_value)}
                        </p>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ký {channelDate(contract.signed_on)} · Bảo vệ đến{' '}
                      {channelDate(contract.protection_until)}
                    </p>
                    {contract.evidence_reference && (
                      <div className="mt-2">
                        <EvidenceReference
                          value={contract.evidence_reference}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {detail.data.can_record_support && (
                  <SupportNote
                    onSubmit={async (content) => {
                      await run({
                        path: `/customers/${customerId}/support-activities`,
                        body: { content },
                      });
                    }}
                  />
                )}
                <h4 className="mt-2 font-semibold">Lịch sử hoạt động</h4>
                <ol className="space-y-4 border-l pl-4">
                  {detail.data.activities.map((activity) => (
                    <li key={activity.id}>
                      <p className="text-sm font-medium">
                        {activity.user_name}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          · {channelDate(activity.created_at)}
                        </span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {activity.content}
                      </p>
                      {activity.next_follow_up_at && (
                        <p className="mt-1 text-xs text-primary">
                          Hẹn lại: {channelDate(activity.next_follow_up_at)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
                {detail.data.activities.length === 0 && (
                  <Empty message="Chưa có hoạt động hiển thị." />
                )}
              </>
            )
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
          {modal}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinancePanel({
  data,
  can,
  run,
  pending,
  showModal,
  closeModal,
}: {
  data: FinanceWorkspace;
  can: (p: string) => boolean;
  run: (command: Command) => Promise<void>;
  pending: boolean;
  showModal: (content: ReactNode) => void;
  closeModal: () => void;
}) {
  const metrics = [
    ['Hoa hồng phát sinh', data.summary.accrued],
    ['Đủ điều kiện lập chi', data.summary.eligible],
    ['Đã duyệt chờ chi', data.summary.approved],
    ['Thực lãnh trong tháng', data.summary.take_home],
  ] as const;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value], index) => (
          <div
            key={label}
            className={`rounded-2xl border p-5 shadow-sm ${index === 3 ? 'border-[#6558d3] bg-[#6558d3] text-white' : 'bg-card'}`}
          >
            <p
              className={`text-xs ${index === 3 ? 'text-white/75' : 'text-muted-foreground'}`}
            >
              {label}
            </p>
            <p className="mt-3 text-2xl font-bold tracking-tight">
              {money(value)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Thực thu gộp {money(data.summary.collected_revenue)} · Đã hoàn{' '}
          {money(data.summary.refunded_revenue)} · Thu ròng{' '}
          {money(data.summary.net_collected_revenue)} · Đã chi{' '}
          {money(data.summary.paid)} · Khấu trừ{' '}
          {money(data.summary.withholding)}
        </p>
        {can('channel_sales.payout.create') && (
          <Button
            onClick={() =>
              showModal(
                <PayoutForm
                  data={data}
                  onSubmit={async (body) => {
                    await run({ path: '/payouts', body });
                    closeModal();
                  }}
                />,
              )
            }
          >
            <Plus /> Lập phiếu chi
          </Button>
        )}
      </div>
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h3 className="font-semibold">Sổ hoa hồng</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Mỗi dòng giữ nguyên cơ sở tính và phiên bản chính sách đã áp dụng.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                {[
                  'Nhân sự / Hợp đồng',
                  'Thực thu làm cơ sở',
                  'Chính sách',
                  'Hoa hồng',
                  'Trạng thái',
                ].map((label) => (
                  <th key={label} className="px-5 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.ledger.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-5 py-4">
                    <p className="font-medium">{entry.beneficiary_name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.contract_code} · {channelDate(entry.occurred_at)}
                    </p>
                    {entry.reason && (
                      <p className="mt-1 max-w-60 text-xs text-muted-foreground">
                        Điều chỉnh: {entry.reason}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">{money(entry.calculation_base)}</td>
                  <td className="px-5 py-4">
                    <p>{entry.rate_percent}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.policy_code}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {money(entry.amount)}
                  </td>
                  <td className="px-5 py-4">
                    <StateBadge value={entry.payout_status} />
                    {entry.reconciliation_status !== 'CONFIRMED' && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        Chờ đối soát
                      </p>
                    )}
                    {entry.entry_type === 'ACCRUAL' &&
                      can('channel_sales.commission.adjust') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1"
                          onClick={() =>
                            showModal(
                              <AdjustmentForm
                                entry={entry}
                                period={data.period}
                                onSubmit={async (body) => {
                                  await run({
                                    path: `/commissions/${entry.id}/adjustments`,
                                    body,
                                  });
                                  closeModal();
                                }}
                              />,
                            )
                          }
                        >
                          Điều chỉnh
                        </Button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.ledger.length === 0 && (
            <Empty message="Chưa có hoa hồng phát sinh trong kỳ đã chọn." />
          )}
          {data.ledger_total > data.ledger.length && (
            <p className="p-4 text-xs text-muted-foreground">
              Hiển thị {data.ledger.length}/{data.ledger_total} bút toán.
            </p>
          )}
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <h3 className="mb-4 font-semibold">Phiếu chi trong kỳ</h3>
        <div className="space-y-3">
          {data.payouts.map((payout) => (
            <div key={payout.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {payout.beneficiary_name}{' '}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {payout.period}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {payout.code}
                  </p>
                  <p className="mt-2 text-sm">
                    {money(payout.gross_amount)} −{' '}
                    {money(payout.withholding_amount)} ={' '}
                    <strong>{money(payout.net_amount)}</strong>
                  </p>
                  {payout.withholding_reason && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Khấu trừ: {payout.withholding_reason}
                    </p>
                  )}
                  {payout.payment_reference && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Giao dịch: {payout.payment_reference} ·{' '}
                      {channelDate(payout.paid_at)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StateBadge value={payout.status} />
                  {payout.status === 'DRAFT' &&
                    can('channel_sales.payout.approve') && (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run({ path: `/payouts/${payout.id}/approve` }).catch(
                            () => undefined,
                          )
                        }
                      >
                        <FileCheck2 /> Duyệt
                      </Button>
                    )}
                  {payout.status === 'APPROVED' &&
                    can('channel_sales.payout.complete') && (
                      <Button
                        size="sm"
                        onClick={() =>
                          showModal(
                            <ReasonForm
                              title="Ghi nhận đã chi"
                              description={`${payout.beneficiary_name} · ${money(payout.net_amount)}. Nhập mã giao dịch đã thực hiện để lưu xác nhận.`}
                              label="Mã giao dịch / phiếu chi"
                              onSubmit={async (payment_reference) => {
                                await run({
                                  path: `/payouts/${payout.id}/complete`,
                                  body: { payment_reference },
                                });
                                closeModal();
                              }}
                            />,
                          )
                        }
                      >
                        Ghi nhận đã chi <ChevronRight />
                      </Button>
                    )}
                </div>
              </div>
              <details className="mt-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Lịch sử xử lý</summary>
                {payout.events.map((event, index) => (
                  <p key={index} className="mt-2">
                    {eventCopy[event.event_type] ?? event.event_type} ·{' '}
                    {channelDate(event.created_at)}
                  </p>
                ))}
              </details>
            </div>
          ))}
          {data.payouts.length === 0 && (
            <Empty message="Chưa lập phiếu chi trong kỳ này." />
          )}
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">Phiên bản chính sách</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Phiên bản mới chỉ áp dụng từ ngày hiệu lực; lịch sử đã tính giữ
              nguyên.
            </p>
          </div>
          {can('channel_sales.policy.manage') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                showModal(
                  <PolicyForm
                    data={data}
                    onSubmit={async (body) => {
                      await run({ path: '/commission-policies', body });
                      closeModal();
                    }}
                  />,
                )
              }
            >
              <Plus /> Phiên bản mới
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.policies.map((policy) => (
            <div key={policy.id} className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{policy.name}</p>
                <span className="font-bold text-primary">
                  {policy.rate_percent}%
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-violet-600">
                {policy.personnel_type
                  ? (personnelCopy[policy.personnel_type] ??
                    policy.personnel_type)
                  : 'Áp dụng chung trong phạm vi chính sách'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {policy.code} · Từ {channelDate(policy.effective_from)}
                {policy.effective_until
                  ? ` đến ${channelDate(policy.effective_until)}`
                  : ''}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const adjustmentSchema = z.object({
  amount: z.coerce
    .number<number>()
    .int()
    .refine((value) => value !== 0, 'Số điều chỉnh phải khác 0.'),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  reason: z.string().trim().min(3).max(1000),
});
function AdjustmentForm({
  entry,
  period,
  onSubmit,
}: {
  entry: FinanceWorkspace['ledger'][number];
  period: string;
  onSubmit: (input: unknown) => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      amount: 0,
      period:
        period < currentBusinessPeriod() ? currentBusinessPeriod() : period,
      reason: '',
    },
  });
  const [key] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (input) => {
        try {
          setError('');
          await onSubmit({ ...input, idempotency_key: key });
        } catch (cause) {
          setError(errorMessage(cause));
        }
      })}
    >
      <DialogTitle>Điều chỉnh hoa hồng</DialogTitle>
      <DialogDescription>
        {entry.beneficiary_name} · {entry.contract_code} · Gốc{' '}
        {money(entry.amount)}. Điều chỉnh được ghi thành dòng mới và không sửa
        phiếu đã chi.
      </DialogDescription>
      <Label text="Số điều chỉnh (âm để giảm, dương để tăng)">
        <Input
          type="number"
          {...form.register('amount', { valueAsNumber: true })}
        />
      </Label>
      <Label text="Kỳ ghi nhận">
        <Input type="month" {...form.register('period')} />
      </Label>
      <Label text="Lý do / chứng từ">
        <Input {...form.register('reason')} />
      </Label>
      <FormErrors error={error} errors={form.formState.errors} />
      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full"
      >
        Ghi bút toán điều chỉnh
      </Button>
    </form>
  );
}

const payoutSchema = z.object({
  organization_id: z.coerce.number<number>().positive(),
  beneficiary_user_id: z.coerce.number<number>().positive(),
  withholding_amount: z.coerce.number<number>().min(0).int(),
  withholding_reason: z.string(),
});
function PayoutForm({
  data,
  onSubmit,
}: {
  data: FinanceWorkspace;
  onSubmit: (input: unknown) => Promise<void>;
}) {
  const eligible = data.ledger.filter(
    (entry) =>
      entry.payout_status === 'ACCRUED' &&
      entry.reconciliation_status === 'CONFIRMED',
  );
  const candidates = Array.from(
    new Map(
      eligible.map((entry) => [
        `${entry.beneficiary_organization_id}-${entry.beneficiary_user_id}`,
        entry,
      ]),
    ).values(),
  );
  const [candidate, setCandidate] = useState<
    FinanceWorkspace['ledger'][number] | undefined
  >(candidates[0]);
  const [key] = useState(() => crypto.randomUUID());
  const form = useForm({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      organization_id: candidate?.beneficiary_organization_id ?? 0,
      beneficiary_user_id: candidate?.beneficiary_user_id ?? 0,
      withholding_amount: 0,
      withholding_reason: '',
    },
  });
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (input) => {
        try {
          setError('');
          await onSubmit({
            ...input,
            idempotency_key: key,
            period: data.period,
          });
        } catch (cause) {
          setError(errorMessage(cause));
        }
      })}
    >
      <DialogTitle>Lập phiếu chi hoa hồng</DialogTitle>
      <DialogDescription>
        Chỉ tập hợp bút toán đã đối soát và chưa nằm trong phiếu chi khác. Kỳ{' '}
        {data.period}.
      </DialogDescription>
      <Label text="Nhân sự nhận hoa hồng">
        <Select
          value={
            candidate
              ? `${candidate.beneficiary_organization_id}-${candidate.beneficiary_user_id}`
              : ''
          }
          onChange={(event) => {
            const selected = candidates.find(
              (entry) =>
                `${entry.beneficiary_organization_id}-${entry.beneficiary_user_id}` ===
                event.target.value,
            );
            setCandidate(selected);
            if (selected) {
              form.setValue(
                'organization_id',
                selected.beneficiary_organization_id,
              );
              form.setValue(
                'beneficiary_user_id',
                selected.beneficiary_user_id,
              );
            }
          }}
        >
          {candidates.map((entry) => (
            <option
              key={`${entry.beneficiary_organization_id}-${entry.beneficiary_user_id}`}
              value={`${entry.beneficiary_organization_id}-${entry.beneficiary_user_id}`}
            >
              {entry.beneficiary_name}
            </option>
          ))}
        </Select>
      </Label>
      {!candidates.length && (
        <p className="text-sm text-amber-700">
          Chưa có bút toán đủ điều kiện. Hoàn tất đối soát CHECKEE trước.
        </p>
      )}
      <Label text="Khấu trừ (đồng)">
        <Input
          type="number"
          min={0}
          {...form.register('withholding_amount', { valueAsNumber: true })}
        />
      </Label>
      <Label text="Lý do khấu trừ">
        <Input {...form.register('withholding_reason')} />
      </Label>
      <FormErrors error={error} errors={form.formState.errors} />
      <Button
        type="submit"
        disabled={form.formState.isSubmitting || !candidate}
        className="w-full"
      >
        {form.formState.isSubmitting ? 'Đang lập…' : 'Lập phiếu chờ duyệt'}
      </Button>
    </form>
  );
}

const policySchema = z.object({
  organization_id: z.coerce.number<number>().positive(),
  code: z.string().trim().min(2).max(48),
  name: z.string().trim().min(2).max(190),
  rate_percent: z.coerce.number<number>().min(0).max(100),
  effective_from: z.string().min(10),
  personnel_type: z.string(),
});
function PolicyForm({
  data,
  onSubmit,
}: {
  data: FinanceWorkspace;
  onSubmit: (input: unknown) => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(policySchema),
    defaultValues: {
      organization_id: data.organizations[0]?.id ?? 0,
      code: '',
      name: '',
      rate_percent: 0,
      effective_from: '',
      personnel_type: '',
    },
  });
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (input) => {
        try {
          setError('');
          await onSubmit(input);
        } catch (cause) {
          setError(errorMessage(cause));
        }
      })}
    >
      <DialogTitle>Phiên bản chính sách mới</DialogTitle>
      <DialogDescription>
        Ngày hiệu lực sớm nhất từ ngày mai; tỷ lệ không vượt hạn mức được giao.
      </DialogDescription>
      <Label text="Nhóm nhân sự áp dụng">
        <Select {...form.register('personnel_type')}>
          <option value="">Chính sách chung</option>
          {data.personnel_types?.map((code) => (
            <option key={code} value={code}>
              {personnelCopy[code] ?? code}
            </option>
          ))}
        </Select>
      </Label>
      <Label text="Tổ chức">
        <Select {...form.register('organization_id', { valueAsNumber: true })}>
          {data.organizations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · tối đa {item.commission_rate_ceiling}%
            </option>
          ))}
        </Select>
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <Label text="Mã phiên bản">
          <Input {...form.register('code')} placeholder="PARTNER-2026-V2" />
        </Label>
        <Label text="Tỷ lệ (%)">
          <Input
            type="number"
            step="0.0001"
            {...form.register('rate_percent', { valueAsNumber: true })}
          />
        </Label>
      </div>
      <Label text="Tên chính sách">
        <Input {...form.register('name')} />
      </Label>
      <Label text="Ngày bắt đầu hiệu lực">
        <Input type="date" {...form.register('effective_from')} />
      </Label>
      <FormErrors error={error} errors={form.formState.errors} />
      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full"
      >
        Tạo phiên bản
      </Button>
    </form>
  );
}

const accountSchema = z.object({
  organization_id: z.coerce.number<number>().positive(),
  name: z.string().trim().min(2).max(190),
  email: z.email(),
  password: z.string().min(12).max(128),
  role_code: z.string().min(1),
});
function AccountForm({
  data,
  onSubmit,
}: {
  data: ChannelManagement;
  onSubmit: (input: unknown) => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      organization_id: data.organizations[0]?.id ?? 0,
      name: '',
      email: '',
      password: '',
      role_code:
        data.roles.find((role) => role.code === 'PARTNER_COLLABORATOR')?.code ??
        data.roles[0]?.code ??
        '',
    },
  });
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (input) => {
        try {
          setError('');
          await onSubmit(input);
        } catch (cause) {
          setError(errorMessage(cause));
        }
      })}
    >
      <DialogTitle>Cấp tài khoản CRM</DialogTitle>
      <DialogDescription>
        Quyền và dữ liệu được giới hạn theo tổ chức được chọn.
      </DialogDescription>
      <Label text="Tổ chức">
        <Select {...form.register('organization_id', { valueAsNumber: true })}>
          {data.organizations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
      </Label>
      <Label text="Họ tên">
        <Input autoComplete="off" {...form.register('name')} />
      </Label>
      <Label text="Email đăng nhập">
        <Input type="email" autoComplete="off" {...form.register('email')} />
      </Label>
      <Label text="Mật khẩu ban đầu (ít nhất 12 ký tự)">
        <Input
          type="password"
          autoComplete="new-password"
          {...form.register('password')}
        />
      </Label>
      <Label text="Vai trò">
        <Select {...form.register('role_code')}>
          {data.roles.map((role) => (
            <option key={role.code} value={role.code}>
              {role.name}
            </option>
          ))}
        </Select>
      </Label>
      <FormErrors error={error} errors={form.formState.errors} />
      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full"
      >
        Tạo tài khoản
      </Button>
    </form>
  );
}

function ReasonForm({
  title,
  description,
  label,
  onSubmit,
}: {
  title: string;
  description: string;
  label: string;
  onSubmit: (value: string) => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(
      z.object({ reason: z.string().trim().min(1).max(120) }),
    ),
    defaultValues: { reason: '' },
  });
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (input) => {
        try {
          setError('');
          await onSubmit(input.reason);
        } catch (cause) {
          setError(errorMessage(cause));
        }
      })}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <Label text={label}>
        <Input {...form.register('reason')} />
      </Label>
      <FormErrors error={error} errors={form.formState.errors} />
      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full"
      >
        {form.formState.isSubmitting ? 'Đang lưu…' : 'Xác nhận'}
      </Button>
    </form>
  );
}

function SupportNote({
  onSubmit,
}: {
  onSubmit: (content: string) => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(
      z.object({ content: z.string().trim().min(1).max(4000) }),
    ),
    defaultValues: { content: '' },
  });
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      onSubmit={form.handleSubmit(async (input) => {
        try {
          setError('');
          await onSubmit(input.content);
          form.reset();
        } catch (cause) {
          setError(errorMessage(cause));
        }
      })}
    >
      <Label text="Ghi nhận chăm sóc / hỗ trợ">
        <textarea
          {...form.register('content')}
          rows={3}
          className="w-full rounded-xl border bg-background p-3 text-sm"
          placeholder="Vấn đề cần hỗ trợ, nội dung bàn giao, kết quả xử lý…"
        />
      </Label>
      <FormErrors error={error} errors={form.formState.errors} />
      <Button size="sm" type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Đang lưu…' : 'Lưu hoạt động hỗ trợ'}
      </Button>
    </form>
  );
}

function PanelHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {text}
      {children}
    </label>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
function Loading() {
  return (
    <div
      className="h-60 animate-pulse rounded-2xl bg-muted"
      aria-label="Đang tải dữ liệu"
    />
  );
}
function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
function Empty({ message }: { message: string }) {
  return (
    <div className="grid min-h-32 place-items-center p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
    />
  );
}
function FormErrors({
  error,
  errors,
}: {
  error: string;
  errors: Record<string, { message?: string }>;
}) {
  const message =
    error || Object.values(errors).find((item) => item.message)?.message;
  return message ? <ErrorBox message={message} /> : null;
}
function StateBadge({ value }: { value: string }) {
  const positive = ['CONFIRMED', 'PAID', 'ACTIVE'].includes(value);
  return (
    <Badge
      variant="outline"
      className={
        positive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
      }
    >
      {stateCopy[value] ?? value}
    </Badge>
  );
}
const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'Không thể lưu dữ liệu.';
const stateCopy: Record<string, string> = {
  REVIEW_REQUIRED: 'Cần đối soát lại',
  CANCELLED: 'Đã hủy',
  ACTIVE: 'Hoạt động',
  SUSPENDED: 'Tạm ngưng',
  PENDING: 'Chờ xác nhận',
  DISPUTED: 'Đang tranh chấp',
  CONFIRMED: 'Đã xác nhận',
  RESOLVED: 'Đã giải quyết',
  DRAFT: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PAID: 'Đã chi',
  ACCRUED: 'Phát sinh',
};
const personnelCopy: Record<string, string> = {
  SALES: 'Nhân viên bán hàng',
  COLLABORATOR: 'Cộng tác viên',
  SALES_MANAGER: 'Quản lý bán hàng',
  PARTNER_ADMIN: 'Quản lý đối tác',
};
const eventCopy: Record<string, string> = {
  OPENED: 'Mở đối soát',
  DISPUTED: 'Ghi nhận tranh chấp',
  CONFIRMED: 'Xác nhận quyền bảo vệ',
  CREATED: 'Lập phiếu chi',
  APPROVED: 'Duyệt phiếu chi',
  PAID: 'Ghi nhận đã chi',
};
const roleCopy: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  SALES: 'Nhân viên bán hàng',
  PARTNER_ADMIN: 'Quản lý đối tác',
  COLLABORATOR: 'Cộng tác viên',
  PARTNER_COLLABORATOR: 'Cộng tác viên',
  RECONCILIATION: 'Đối soát CHECKEE',
};
