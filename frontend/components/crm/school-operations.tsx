'use client';
import { useDeferredValue, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Clock3,
  History,
  Plus,
  ShieldCheck,
  UsersRound,
  HeartHandshake,
  Scale,
  BarChart3,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  channelRequest,
  channelQueryKeys,
  channelMoney,
  currentBusinessPeriod,
} from '@/lib/channel-operations';
import {
  workflowDate,
  workflowLabels,
  vietnamDateTimeInput,
  type SchoolOperationsWorkspace,
  type SchoolOperationsReport,
} from '@/lib/school-operations';
import {
  schoolOperationsPreview,
  schoolOperationsReportPreview,
} from '@/lib/school-operations-preview';
import {
  SchoolActionForm,
  type SchoolAction,
  type SchoolActionField,
} from './school-action-form';

type Props = {
  apiBase: string;
  token: string;
  abilities: string[];
  onChanged: () => Promise<void>;
};
const reason: SchoolActionField = {
  name: 'reason',
  label: 'Lý do / căn cứ quyết định',
  type: 'textarea',
};
const deadline: SchoolActionField = {
  name: 'review_due_at',
  label: 'Hạn xử lý',
  type: 'datetime-local',
  hint: 'Khi đã có chính sách được duyệt, hệ thống tính hạn theo chính sách.',
};
const yesNo = [
  { value: 'false', label: 'Không' },
  { value: 'true', label: 'Có' },
];

export function SchoolOperations({
  apiBase,
  token,
  abilities,
  onChanged,
}: Props) {
  const [tab, setTab] = useState('proposals');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const searchTerm = useDeferredValue(search.trim());
  const [pendingOnly, setPendingOnly] = useState(true);
  const [period, setPeriod] = useState(currentBusinessPeriod);
  const [action, setAction] = useState<SchoolAction | null>(null);
  const [history, setHistory] = useState<{
    kind: string;
    id: number;
    name: string;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const client = useQueryClient();
  const preview = !apiBase;
  const has = (code: string) => abilities.includes(code);
  const can = (code: string) => !preview && has(code);
  const all = has('channel_sales.scope.all');
  const sales = has('channel_sales.approach.register');
  const manager = has('channel_sales.school.allocation.manage');
  const care =
    has('channel_sales.school.support.manage') ||
    has('channel_sales.school.care.assign');
  const reportAccess =
    all ||
    manager ||
    has('channel_sales.school.escalation.resolve') ||
    has('channel_sales.school.dispute.resolve');
  const api = <T,>(path: string, options?: RequestInit) =>
    channelRequest<T>(apiBase, token, path, options);
  const workspace = useQuery({
    queryKey: [...channelQueryKeys.all, 'school-operations', page, searchTerm],
    queryFn: () =>
      preview
        ? Promise.resolve(schoolOperationsPreview(abilities))
        : api<SchoolOperationsWorkspace>(
            '/school-operations?page=' +
              page +
              '&search=' +
              encodeURIComponent(searchTerm),
          ),
    enabled: preview || !!token,
    refetchInterval: preview ? false : 30000,
    placeholderData: (previous) => previous,
  });
  const tabs = [
    {
      id: 'proposals',
      label: 'Đề xuất trường',
      icon: ClipboardList,
      show: sales || manager || all,
    },
    {
      id: 'invitations',
      label: 'Phân bổ',
      icon: UsersRound,
      show: sales || manager || all,
    },
    {
      id: 'extensions',
      label: 'Gia hạn',
      icon: Clock3,
      show: sales || manager || all,
    },
    {
      id: 'disputes',
      label: 'Tranh chấp',
      icon: Scale,
      show: sales || manager || all || has('channel_sales.reconcile'),
    },
    { id: 'care', label: 'Chăm sóc', icon: HeartHandshake, show: care || all },
    {
      id: 'handovers',
      label: 'Bàn giao',
      icon: UsersRound,
      show: manager || all,
    },
    {
      id: 'finance',
      label: 'Hủy & hoàn',
      icon: ShieldCheck,
      show:
        all ||
        has('channel_sales.contract.cancel') ||
        has('channel_sales.revenue.refund'),
    },
    {
      id: 'policies',
      label: 'Chính sách',
      icon: Settings2,
      show: sales || manager || all,
    },
    { id: 'report', label: 'Giám sát', icon: BarChart3, show: reportAccess },
  ].filter((t) => t.show);
  const active =
    tabs.find((t) => t.id === tab)?.id ?? tabs[0]?.id ?? 'disputes';
  const report = useQuery({
    queryKey: [...channelQueryKeys.all, 'school-operation-report', period],
    queryFn: () =>
      preview
        ? Promise.resolve(schoolOperationsReportPreview())
        : api<SchoolOperationsReport>(
            '/school-operations/report?period=' + period,
          ),
    enabled: reportAccess && active === 'report' && (preview || !!token),
  });
  const historyQuery = useQuery({
    queryKey: [
      ...channelQueryKeys.all,
      'school-operation-history',
      history?.kind,
      history?.id,
    ],
    queryFn: () =>
      api<{
        data: {
          id: number;
          action: string;
          actor_name: string;
          created_at: string;
          new_values: string | null;
        }[];
      }>(
        '/school-operations/' + history!.kind + '/' + history!.id + '/history',
      ),
    enabled: !preview && history !== null,
  });
  const save = async (command: {
    path: string;
    method?: string;
    body: Record<string, unknown>;
  }) => {
    if (preview) throw new Error('Thao tác ghi nhận dùng bản CRM của tổ chức.');
    await api(command.path, {
      method: command.method ?? 'POST',
      body: JSON.stringify(command.body),
    });
    setAction(null);
    setNotice('Đã lưu thay đổi và lịch sử xử lý.');
    const refresh = await Promise.allSettled([
      client.invalidateQueries({ queryKey: channelQueryKeys.all }),
      onChanged(),
    ]);
    if (refresh.some((r) => r.status === 'rejected'))
      setNotice(
        'Đã lưu. Chưa tải lại được toàn bộ dữ liệu; anh có thể bấm Làm mới.',
      );
  };
  const data = workspace.data;
  const matches = (...values: (string | null)[]) => {
    if (!preview) return true;
    const normalize = (v: string) =>
      v
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .toLocaleLowerCase('vi');
    return normalize(values.filter(Boolean).join(' ')).includes(
      normalize(search),
    );
  };
  const historyButton = (kind: string, id: number, name: string) =>
    !preview && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setHistory({ kind, id, name })}
      >
        <History className="size-3.5" /> Lịch sử
      </Button>
    );
  const decide = (
    title: string,
    path: string,
    approve: boolean,
    extra: SchoolActionField[] = [],
  ) =>
    setAction({
      title,
      path,
      description: approve
        ? 'Kiểm tra thông tin và ghi căn cứ trước khi xác nhận.'
        : 'Ghi rõ lý do để người gửi có thể theo dõi và bổ sung hồ sơ.',
      fields: [...extra, reason],
      preset: { approve },
      submitLabel: approve ? 'Xác nhận duyệt' : 'Xác nhận từ chối',
      danger: !approve,
    });
  const openProposal = () =>
    setAction({
      title: 'Đề xuất trường mới',
      path: '/school-proposals',
      description:
        'Đề xuất gửi tới Quản lý trực tiếp, sau đó chuyển Admin. Hồ sơ chưa tạo quyền tiếp cận.',
      fields: [
        { name: 'school_code', label: 'Mã trường đề xuất' },
        { name: 'name', label: 'Tên trường' },
        { name: 'province', label: 'Tỉnh / thành phố' },
        { name: 'ward', label: 'Phường / xã' },
        { name: 'address', label: 'Địa chỉ', optional: true },
        { name: 'contact_name', label: 'Người liên hệ', optional: true },
        { name: 'contact_position', label: 'Chức vụ', optional: true },
        { name: 'contact_phone', label: 'Điện thoại liên hệ', optional: true },
        { name: 'email', label: 'Email', type: 'email', optional: true },
        deadline,
        reason,
      ],
    });
  const openPolicy = () =>
    setAction({
      title: 'Tạo phiên bản chính sách',
      path: '/school-workflow-policies',
      description:
        'Các số điền sẵn là gợi ý. Bản nháp chưa áp dụng. Chỉ chọn áp dụng khi đã có quyết định phê duyệt.',
      fields: [
        {
          name: 'organization_id',
          label: 'Tổ chức',
          type: 'number',
          options: data?.organizations.map((o) => ({
            value: String(o.id),
            label: o.name,
          })),
        },
        {
          name: 'manager_review_hours',
          label: 'Quản lý phản hồi trong (giờ)',
          type: 'number',
          value: '24',
        },
        {
          name: 'admin_review_hours',
          label: 'Admin phản hồi trong (giờ)',
          type: 'number',
          value: '48',
        },
        {
          name: 'invitation_hours',
          label: 'Phản hồi phân bổ trong (giờ)',
          type: 'number',
          value: '24',
        },
        {
          name: 'max_extension_days',
          label: 'Tối đa mỗi lần gia hạn (ngày)',
          type: 'number',
          value: '7',
        },
        {
          name: 'max_extension_count',
          label: 'Số lần gia hạn tối đa',
          type: 'number',
          value: '2',
        },
        {
          name: 'max_total_extension_days',
          label: 'Tổng ngày gia hạn tối đa',
          type: 'number',
          value: '14',
        },
        {
          name: 'decision_reference',
          label: 'Mã quyết định / căn cứ phê duyệt',
        },
        {
          name: 'activate',
          label: 'Trạng thái phiên bản',
          type: 'boolean',
          value: 'false',
          options: [
            { value: 'false', label: 'Bản nháp, chưa áp dụng' },
            { value: 'true', label: 'Đã được phê duyệt, áp dụng' },
          ],
        },
      ],
    });
  if (workspace.isPending)
    return (
      <output className="rounded-2xl border bg-card p-8 text-muted-foreground">
        Đang tải hàng chờ xử lý…
      </output>
    );
  if (workspace.error || !data)
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
        {workspace.error?.message ?? 'Không tải được dữ liệu.'}
      </p>
    );
  const visibleCounts: Record<string, number> = {
    proposals: data.proposals.filter(
      (x) =>
        matches(x.name, x.school_code, x.submitted_by) &&
        (!pendingOnly || x.status.startsWith('PENDING_')),
    ).length,
    invitations:
      data.invitations.filter(
        (x) =>
          matches(x.school_name, x.assignee_name, x.reason) &&
          (!pendingOnly || (x.status === 'PENDING' && !x.is_expired)),
      ).length +
      data.deferrals.filter(
        (x) =>
          matches(x.school_name, x.reason) &&
          (!pendingOnly || x.status === 'OPEN'),
      ).length,
    extensions: data.extensions.filter(
      (x) =>
        matches(x.school_name, x.requested_by, x.progress) &&
        (!pendingOnly || x.status === 'PENDING'),
    ).length,
    disputes: data.disputes.filter(
      (x) =>
        matches(x.school_name, x.opened_by, x.reason) &&
        (!pendingOnly || x.status === 'OPEN'),
    ).length,
    care:
      data.support_cases.filter(
        (x) =>
          matches(x.customer_name, x.subject, x.assigned_name) &&
          (!pendingOnly || x.status !== 'RESOLVED'),
      ).length +
      data.contracts.filter(
        (c) => c.can_assign_care && matches(c.customer_name, c.contract_code),
      ).length,
    handovers:
      data.team.filter(
        (m) =>
          matches(m.name) &&
          ((m.can_handover && m.status === 'ACTIVE') ||
            (!pendingOnly && m.can_reactivate)),
      ).length +
      data.handovers.filter((x) => matches(x.user_name, x.reason, x.summary))
        .length,
    finance:
      data.contracts.filter(
        (c) =>
          matches(c.contract_code, c.customer_name) &&
          (!pendingOnly || c.can_cancel),
      ).length +
      data.receipts.filter((r) => matches(r.contract_code, r.reference_code))
        .length +
      data.refunds.filter((r) => matches(r.reference_code, r.reason)).length,
    policies: data.policies.length + data.imports.length,
  };
  const total = data.pagination?.totals[active] ?? 0;
  const pageSize = data.pagination?.page_size ?? 100;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-to-br from-violet-50/80 to-card p-6 dark:from-violet-950/20">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-violet-600">
            Phân phối sản phẩm · Vận hành
          </p>
          <h2 className="text-xl font-bold tracking-tight">
            Mỗi hồ sơ, một bước tiếp theo
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Theo dõi đề xuất, phản hồi phân bổ, gia hạn và bàn giao. Hồ sơ quá
            hạn xuất hiện trong hàng chờ của Ban giám đốc.
          </p>
        </div>
        {can('channel_sales.school.proposal.submit') && !all && (
          <Button onClick={openProposal}>
            <Plus className="size-4" /> Đề xuất trường
          </Button>
        )}
      </header>
      {preview && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Các tình huống dưới đây dùng dữ liệu minh họa, chỉ đọc. Để ghi nhận hồ
          sơ và bảo vệ quyền, dùng bản CRM của tổ chức.
        </p>
      )}
      {notice && (
        <output className="block rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </output>
      )}
      <nav
        aria-label="Nhóm công việc vận hành"
        className="flex gap-1 overflow-x-auto rounded-2xl border bg-card p-1.5"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setSearch('');
              setPage(1);
            }}
            className={
              'flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ' +
              (active === t.id
                ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200'
                : 'text-muted-foreground hover:bg-muted')
            }
            aria-current={active === t.id ? 'page' : undefined}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </nav>
      {active !== 'report' && active !== 'policies' && (
        <div className="flex flex-wrap gap-3">
          <Input
            aria-label="Tìm hồ sơ vận hành"
            placeholder="Tìm theo tên trường, nhân sự hoặc nội dung…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-md"
          />
          <Button
            variant={pendingOnly ? 'default' : 'outline'}
            onClick={() => setPendingOnly((v) => !v)}
          >
            {pendingOnly ? 'Cần xử lý' : 'Tất cả trạng thái'}
          </Button>
          <p className="self-center text-xs text-muted-foreground">
            Phân bổ, xin gia hạn và chỉnh dữ liệu từ Hồ sơ trường.
          </p>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {active === 'proposals' &&
          data.proposals
            .filter(
              (x) =>
                matches(x.name, x.school_code, x.submitted_by) &&
                (!pendingOnly || x.status.startsWith('PENDING_')),
            )
            .map((x) => (
              <WorkflowCard
                key={x.id}
                title={x.name}
                subtitle={x.school_code + ' · ' + x.province + ' · ' + x.ward}
                status={x.status}
                overdue={x.is_overdue}
                due={x.review_due_at}
              >
                <p>{x.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {x.submitted_by} → {x.manager_name} → Admin
                </p>
                {x.contact_name && (
                  <p className="text-sm">
                    Liên hệ: {x.contact_name} ·{' '}
                    {x.contact_phone ?? x.email ?? 'Chưa có số liên hệ'}
                  </p>
                )}
                {x.decision_reason && (
                  <p className="rounded-lg bg-muted p-3">{x.decision_reason}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {x.can_manager_review && !preview && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          decide(
                            'Chuyển đề xuất tới Admin',
                            '/school-proposals/' + x.id + '/manager-review',
                            true,
                            [deadline],
                          )
                        }
                      >
                        Chuyển Admin
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          decide(
                            'Từ chối đề xuất',
                            '/school-proposals/' + x.id + '/manager-review',
                            false,
                          )
                        }
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  {x.can_admin_review && !preview && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          decide(
                            'Duyệt bổ sung danh bạ',
                            '/school-proposals/' + x.id + '/admin-review',
                            true,
                            x.possible_duplicate
                              ? [
                                  {
                                    name: 'duplicate_reviewed',
                                    label: 'Xác minh trường cùng tên / khu vực',
                                    type: 'boolean',
                                    value: 'false',
                                    options: [
                                      {
                                        value: 'false',
                                        label: 'Chưa hoàn tất kiểm tra',
                                      },
                                      {
                                        value: 'true',
                                        label: 'Đã xác minh là đơn vị khác',
                                      },
                                    ],
                                    hint: 'Đối chiếu mã trường và hồ sơ định danh. Không tự gộp hai trường chỉ vì cùng tên.',
                                  },
                                ]
                              : [],
                          )
                        }
                      >
                        Duyệt trường
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          decide(
                            'Từ chối bổ sung danh bạ',
                            '/school-proposals/' + x.id + '/admin-review',
                            false,
                          )
                        }
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  {historyButton('proposal', x.id, x.name)}
                </div>
              </WorkflowCard>
            ))}
        {active === 'invitations' && (
          <>
            {data.invitations
              .filter(
                (x) =>
                  matches(x.school_name, x.assignee_name, x.reason) &&
                  (!pendingOnly || (x.status === 'PENDING' && !x.is_expired)),
              )
              .map((x) => (
                <WorkflowCard
                  key={x.id}
                  title={x.school_name}
                  subtitle={x.assigned_by + ' → ' + x.assignee_name}
                  status={x.is_expired ? 'EXPIRED' : x.status}
                  due={x.respond_by}
                >
                  <p>{x.reason}</p>
                  {x.response_reason && (
                    <p className="rounded-lg bg-muted p-3">
                      {x.response_reason}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {x.can_respond && !preview && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            setAction({
                              title: 'Nhận trường',
                              description:
                                'Hệ thống kiểm tra lại quyền hiện tại và hạn mức. Bảo vệ 5 ngày bắt đầu khi nhận thành công.',
                              path: '/school-invitations/' + x.id + '/respond',
                              fields: [],
                              preset: { accept: true },
                            })
                          }
                        >
                          Nhận trường
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setAction({
                              title: 'Từ chối phân bổ',
                              description:
                                'Phản hồi lý do để Quản lý sắp xếp lại.',
                              path: '/school-invitations/' + x.id + '/respond',
                              fields: [reason],
                              preset: { accept: false },
                            })
                          }
                        >
                          Từ chối
                        </Button>
                      </>
                    )}
                    {x.can_cancel && !preview && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setAction({
                            title: 'Hủy lời mời',
                            description:
                              'Lưu lý do thay đổi trước khi phân bổ lại.',
                            path: '/school-invitations/' + x.id + '/cancel',
                            fields: [reason],
                            danger: true,
                          })
                        }
                      >
                        Hủy lời mời
                      </Button>
                    )}
                    {historyButton('invitation', x.id, x.school_name)}
                  </div>
                </WorkflowCard>
              ))}
            {data.deferrals
              .filter(
                (x) =>
                  matches(x.school_name, x.reason) &&
                  (!pendingOnly || x.status === 'OPEN'),
              )
              .map((x) => (
                <WorkflowCard
                  key={'defer-' + x.id}
                  title={x.school_name}
                  subtitle="Rà soát trường chưa có người nhận"
                  status={x.status}
                  due={x.review_at}
                >
                  <p>{x.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    Lịch rà soát không giữ quyền tiếp cận.
                  </p>
                  {x.can_complete && !preview && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAction({
                          title: 'Ghi kết quả rà soát',
                          description: 'Lưu kết quả và sắp xếp bước tiếp theo.',
                          path: '/school-deferrals/' + x.id + '/complete',
                          fields: [reason],
                        })
                      }
                    >
                      Hoàn tất rà soát
                    </Button>
                  )}
                </WorkflowCard>
              ))}
          </>
        )}
        {active === 'extensions' &&
          data.extensions
            .filter(
              (x) =>
                matches(x.school_name, x.requested_by, x.progress) &&
                (!pendingOnly || x.status === 'PENDING'),
            )
            .map((x) => (
              <WorkflowCard
                key={x.id}
                title={x.school_name}
                subtitle={x.requested_by}
                status={x.is_expired ? 'EXPIRED' : x.status}
                due={x.review_due_at}
                overdue={x.is_overdue}
              >
                <p>{x.progress}</p>
                <p className="text-xs">
                  Hạn gốc: {workflowDate(x.original_protected_until)} · Xin đến:{' '}
                  {workflowDate(x.requested_until)}
                </p>
                <p className="text-xs">
                  Lịch hẹn: {workflowDate(x.next_appointment_at)}
                </p>
                <EvidenceReference value={x.evidence_reference} />
                {x.approved_until && (
                  <p className="text-sm">
                    Đã duyệt đến {workflowDate(x.approved_until)} · Rà soát{' '}
                    {workflowDate(x.next_review_at)}
                  </p>
                )}
                {x.decision_reason && (
                  <p className="rounded-lg bg-muted p-3">{x.decision_reason}</p>
                )}
                {x.is_expired && (
                  <p className="text-xs text-amber-700">
                    Quyền gốc đã hết hạn. Hồ sơ chờ không giữ chỗ và không thể
                    phục hồi quyền cũ.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {x.can_review && !preview && (
                    <>
                      {!x.is_expired && (
                        <Button
                          size="sm"
                          onClick={() =>
                            decide(
                              'Duyệt gia hạn',
                              '/school-extensions/' + x.id + '/review',
                              true,
                              [
                                {
                                  name: 'approved_until',
                                  label: 'Gia hạn đến',
                                  type: 'datetime-local',
                                  value: vietnamDateTimeInput(
                                    x.requested_until,
                                  ),
                                },
                                {
                                  name: 'next_review_at',
                                  label: 'Rà soát tiếp theo',
                                  type: 'datetime-local',
                                },
                              ],
                            )
                          }
                        >
                          Duyệt gia hạn
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          decide(
                            'Từ chối gia hạn',
                            '/school-extensions/' + x.id + '/review',
                            false,
                          )
                        }
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  {historyButton('extension', x.id, x.school_name)}
                </div>
              </WorkflowCard>
            ))}
        {active === 'disputes' &&
          data.disputes
            .filter(
              (x) =>
                matches(x.school_name, x.opened_by, x.reason) &&
                (!pendingOnly || x.status === 'OPEN'),
            )
            .map((x) => (
              <WorkflowCard
                key={x.id}
                title={x.school_name}
                subtitle={x.opened_by}
                status={x.status}
              >
                <p>{x.reason}</p>
                <EvidenceReference value={x.evidence_reference} />
                {x.decision && (
                  <p className="font-medium">
                    {workflowLabels[x.decision] ?? x.decision}
                  </p>
                )}
                {x.decision_reason && <p>{x.decision_reason}</p>}
                <div className="flex gap-2">
                  {x.can_resolve && !preview && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setAction({
                          title: 'Kết luận tranh chấp',
                          description:
                            'Kết luận được lưu cùng lịch sử, không tự chuyển quyền hợp lệ hoặc hoa hồng của người khác.',
                          path: '/school-disputes/' + x.id + '/resolve',
                          fields: [
                            {
                              name: 'decision',
                              label: 'Kết luận',
                              type: 'select',
                              options: [
                                'UPHOLD_CURRENT_RIGHTS',
                                'REJECT_CLAIM',
                                'RESOLVED',
                              ].map((code) => ({
                                value: code,
                                label: workflowLabels[code],
                              })),
                            },
                            reason,
                          ],
                        })
                      }
                    >
                      Ghi kết luận
                    </Button>
                  )}
                  {historyButton('dispute', x.id, x.school_name)}
                </div>
              </WorkflowCard>
            ))}
        {active === 'care' && (
          <>
            {can('channel_sales.school.support.manage') && (
              <div className="lg:col-span-2">
                <Button
                  onClick={() =>
                    setAction({
                      title: 'Tiếp nhận yêu cầu hỗ trợ',
                      description:
                        'Hồ sơ gắn với hợp đồng đã bàn giao cho người CSKH.',
                      path: '/customer-support-cases',
                      fields: [
                        {
                          name: 'contract_id',
                          label: 'Hợp đồng',
                          type: 'number',
                          options: data.contracts
                            .filter((c) => c.can_create_support)
                            .map((c) => ({
                              value: String(c.id),
                              label: c.contract_code + ' · ' + c.customer_name,
                            })),
                        },
                        { name: 'subject', label: 'Nội dung cần hỗ trợ' },
                        {
                          name: 'description',
                          label: 'Chi tiết yêu cầu',
                          type: 'textarea',
                        },
                      ],
                    })
                  }
                >
                  <Plus className="size-4" /> Tiếp nhận yêu cầu
                </Button>
              </div>
            )}
            {data.support_cases
              .filter(
                (x) =>
                  matches(x.customer_name, x.subject, x.assigned_name) &&
                  (!pendingOnly || x.status !== 'RESOLVED'),
              )
              .map((x) => (
                <WorkflowCard
                  key={x.id}
                  title={x.subject}
                  subtitle={x.customer_name + ' · ' + x.assigned_name}
                  status={x.status}
                >
                  <p>{x.description}</p>
                  {x.activities.map((a) => (
                    <div
                      key={a.id}
                      className="border-l-2 border-violet-200 pl-3 text-sm"
                    >
                      <p>{a.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {workflowDate(a.occurred_at)}
                        {a.next_follow_up_at
                          ? ' · Hẹn ' + workflowDate(a.next_follow_up_at)
                          : ''}
                      </p>
                    </div>
                  ))}
                  {x.outcome && (
                    <p className="rounded-lg bg-emerald-50 p-3 text-emerald-800">
                      {x.outcome}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {x.can_update && !preview && (
                      <Button
                        size="sm"
                        onClick={() =>
                          setAction({
                            title: 'Cập nhật xử lý hỗ trợ',
                            description:
                              'Ghi tiến độ hoặc kết quả; lịch sử trước đó được giữ nguyên.',
                            path:
                              '/customer-support-cases/' + x.id + '/progress',
                            fields: [
                              {
                                name: 'status',
                                label: 'Trạng thái',
                                type: 'select',
                                options: ['IN_PROGRESS', 'RESOLVED'].map(
                                  (code) => ({
                                    value: code,
                                    label: workflowLabels[code],
                                  }),
                                ),
                              },
                              {
                                name: 'next_follow_up_at',
                                label: 'Hẹn tiếp theo',
                                type: 'datetime-local',
                                optional: true,
                              },
                              {
                                name: 'content',
                                label: 'Tiến độ / kết quả',
                                type: 'textarea',
                              },
                            ],
                          })
                        }
                      >
                        Cập nhật tiến độ
                      </Button>
                    )}
                    {historyButton('support', x.id, x.subject)}
                  </div>
                </WorkflowCard>
              ))}
            {data.contracts
              .filter(
                (c) =>
                  c.can_assign_care &&
                  matches(c.customer_name, c.contract_code),
              )
              .map((c) => (
                <WorkflowCard
                  key={'contract-' + c.id}
                  title={c.customer_name}
                  subtitle={c.contract_code}
                  status={c.status}
                >
                  <p className="text-sm">
                    {c.care_user_id
                      ? 'Người phụ trách: ' +
                        (c.care_name ?? 'Đã phân công') +
                        '. Có thể bàn giao khi thay nhân sự.'
                      : 'Chưa phân công người chăm sóc.'}
                  </p>
                  {!preview && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAction({
                          title: 'Bàn giao người CSKH',
                          description:
                            'Giữ lịch sử, tài liệu và người hưởng hoa hồng. Yêu cầu đang xử lý chuyển sang người mới.',
                          path: '/contracts/' + c.id + '/care-handover',
                          fields: [
                            {
                              name: 'care_member',
                              label: 'Người tiếp nhận',
                              type: 'number',
                              options: data.team
                                .filter((m) => m.can_receive_care)
                                .map((m) => ({
                                  value: String(m.id),
                                  label:
                                    m.name +
                                    ' · ' +
                                    (data.organizations.find(
                                      (o) => o.id === m.organization_id,
                                    )?.name ?? ''),
                                })),
                            },
                            reason,
                          ],
                          prepare: (body) => {
                            const m = data.team.find(
                              (m) => m.id === body.care_member,
                            );
                            if (!m)
                              throw new Error('Cần chọn nhân sự tiếp nhận.');
                            return {
                              ...body,
                              user_id: m.user_id,
                              care_organization_id: m.organization_id,
                            };
                          },
                        })
                      }
                    >
                      Phân công / bàn giao
                    </Button>
                  )}
                </WorkflowCard>
              ))}
          </>
        )}
        {active === 'handovers' && (
          <>
            {data.team
              .filter(
                (m) =>
                  matches(m.name) &&
                  ((m.can_handover && m.status === 'ACTIVE') ||
                    (!pendingOnly && m.can_reactivate)),
              )
              .map((m) => (
                <WorkflowCard
                  key={'member-' + m.id}
                  title={m.name}
                  subtitle={
                    data.organizations.find((o) => o.id === m.organization_id)
                      ?.name ?? ''
                  }
                  status={m.status}
                >
                  <p className="text-sm">
                    {m.status === 'ACTIVE'
                      ? 'Thu hồi quyền chưa ký khi ngưng hoạt động; giữ hợp đồng và hoa hồng hợp lệ.'
                      : 'Khôi phục truy cập không khôi phục các quyền tiếp cận đã thu hồi.'}
                  </p>
                  {!preview && m.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAction({
                          title: 'Bàn giao và ngưng hoạt động',
                          description:
                            'Kiểm tra lịch hẹn, đầu mối, cam kết và hồ sơ trước khi xác nhận.',
                          path: '/school-handovers/' + m.id,
                          fields: [
                            reason,
                            {
                              name: 'summary',
                              label: 'Nội dung bàn giao / việc còn lại',
                              type: 'textarea',
                            },
                            ...(can('channel_sales.identity.manage') && all
                              ? [
                                  {
                                    name: 'suspend_account',
                                    label: 'Khóa toàn bộ tài khoản',
                                    type: 'boolean' as const,
                                    options: yesNo,
                                    value: 'false',
                                  },
                                ]
                              : []),
                          ],
                          preset: { suspend_account: false },
                          danger: true,
                          submitLabel: 'Xác nhận bàn giao và ngưng',
                        })
                      }
                    >
                      Bàn giao nhân sự
                    </Button>
                  )}
                  {!preview && m.can_reactivate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAction({
                          title:
                            m.account_status === 'SUSPENDED'
                              ? 'Khôi phục tài khoản và thành viên'
                              : 'Khôi phục thành viên',
                          description:
                            'Chỉ khôi phục truy cập trong tổ chức đã chọn. Quyền đã thu hồi và lịch sử tài chính giữ nguyên.',
                          path: '/school-team/' + m.id + '/reactivate',
                          fields: [reason],
                          preset: {
                            reactivate_account:
                              m.account_status === 'SUSPENDED',
                          },
                        })
                      }
                    >
                      Khôi phục truy cập
                    </Button>
                  )}
                </WorkflowCard>
              ))}
            {data.handovers
              .filter((x) => matches(x.user_name, x.reason, x.summary))
              .map((x) => (
                <WorkflowCard
                  key={'handover-' + x.id}
                  title={x.user_name}
                  subtitle={workflowDate(x.created_at)}
                  status="COMPLETED"
                >
                  <p>{x.reason}</p>
                  <p>{x.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    Đã thu hồi {x.revoked_registrations} lượt tiếp cận chưa ký ·{' '}
                    {x.account_suspended
                      ? 'Đã khóa tài khoản'
                      : 'Đã ngưng trong tổ chức'}
                  </p>
                </WorkflowCard>
              ))}
          </>
        )}
        {active === 'finance' && (
          <>
            <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground lg:col-span-2">
              Hủy hợp đồng và hoàn tiền được ghi riêng. Sổ hoa hồng gốc được giữ
              nguyên; đối soát cần rà soát lại trước khi chi tiếp. Chính sách tự
              động thu hồi hoa hồng chưa áp dụng.
            </p>
            {data.contracts
              .filter(
                (c) =>
                  matches(c.contract_code, c.customer_name) &&
                  (!pendingOnly || c.can_cancel),
              )
              .map((c) => (
                <WorkflowCard
                  key={'cancel-' + c.id}
                  title={c.customer_name}
                  subtitle={c.contract_code}
                  status={c.status}
                >
                  {c.can_cancel && !preview && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAction({
                          title: 'Ghi nhận quyết định hủy hợp đồng',
                          description:
                            'Chấm dứt bảo vệ của đúng hợp đồng này; không tự hoàn tiền hoặc trừ hoa hồng.',
                          path: '/contracts/' + c.id + '/cancel',
                          fields: [
                            reason,
                            {
                              name: 'decision_reference',
                              label: 'Căn cứ phê duyệt hủy',
                            },
                          ],
                          danger: true,
                          submitLabel: 'Xác nhận hủy hợp đồng',
                        })
                      }
                    >
                      Hủy / chấm dứt
                    </Button>
                  )}
                </WorkflowCard>
              ))}
            {data.receipts
              .filter((r) => matches(r.contract_code, r.reference_code))
              .map((r) => (
                <WorkflowCard
                  key={'receipt-' + r.id}
                  title={r.contract_code}
                  subtitle={r.reference_code}
                >
                  <p>
                    Đã thu {channelMoney(r.amount)} · Đã hoàn{' '}
                    {channelMoney(r.refunded)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {workflowDate(r.received_at)}
                  </p>
                  {can('channel_sales.revenue.refund') &&
                    r.refunded < r.amount && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setAction({
                            title: 'Ghi nhận hoàn tiền thực tế',
                            description:
                              'Dùng chứng từ hoàn đã được duyệt. Không xóa phiếu thu và không tự điều chỉnh hoa hồng.',
                            path: '/receipts/' + r.id + '/refunds',
                            fields: [
                              {
                                name: 'amount',
                                label: 'Số tiền hoàn (đồng)',
                                type: 'number',
                                hint:
                                  'Tối đa còn được hoàn: ' +
                                  channelMoney(r.amount - r.refunded),
                              },
                              {
                                name: 'reference_code',
                                label: 'Mã chứng từ hoàn',
                              },
                              {
                                name: 'decision_reference',
                                label: 'Căn cứ phê duyệt',
                              },
                              {
                                name: 'refunded_at',
                                label: 'Thời điểm hoàn',
                                type: 'datetime-local',
                                optional: true,
                              },
                              reason,
                            ],
                            danger: true,
                            submitLabel: 'Ghi nhận đã hoàn',
                          })
                        }
                      >
                        Ghi nhận hoàn tiền
                      </Button>
                    )}
                </WorkflowCard>
              ))}
            {data.refunds
              .filter((r) => matches(r.reference_code, r.reason))
              .map((r) => (
                <WorkflowCard
                  key={'refund-' + r.id}
                  title={'Đã hoàn ' + channelMoney(r.amount)}
                  subtitle={
                    r.reference_code + ' · ' + workflowDate(r.refunded_at)
                  }
                >
                  <p>{r.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.decision_reference}
                  </p>
                </WorkflowCard>
              ))}
          </>
        )}
        {active === 'policies' && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 p-4 lg:col-span-2">
              <p className="max-w-2xl text-sm text-muted-foreground">
                Gợi ý chờ duyệt: Quản lý 24 giờ, Admin 48 giờ; gia hạn 7
                ngày/lần, tối đa 2 lần và 14 ngày cộng thêm. Hệ thống chưa tự
                bật các mốc này.
              </p>
              {can('channel_sales.school.workflow_policy.manage') && (
                <Button size="sm" onClick={openPolicy}>
                  <Plus className="size-4" /> Tạo phiên bản
                </Button>
              )}
            </div>
            {data.policies.map((p) => (
              <WorkflowCard
                key={p.id}
                title={'Phiên bản ' + p.version}
                subtitle={
                  data.organizations.find((o) => o.id === p.organization_id)
                    ?.name ?? ''
                }
                status={p.status}
              >
                <p className="text-sm">
                  Quản lý: {p.manager_review_hours} giờ · Admin:{' '}
                  {p.admin_review_hours} giờ · Phân bổ: {p.invitation_hours} giờ
                </p>
                <p className="text-sm">
                  Gia hạn tối đa {p.max_extension_days} ngày/lần,{' '}
                  {p.max_extension_count} lần, tổng {p.max_total_extension_days}{' '}
                  ngày.
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.decision_reference}
                </p>
              </WorkflowCard>
            ))}
            {data.imports.map((i) => (
              <WorkflowCard
                key={'import-' + i.id}
                title="Nhập danh bạ"
                subtitle={i.actor_name + ' · ' + workflowDate(i.created_at)}
              >
                <p>
                  {i.schools_created} trường mới · {i.units_created} đơn vị mới
                </p>
              </WorkflowCard>
            ))}
          </>
        )}
      </div>
      {active !== 'report' && visibleCounts[active] === 0 && (
        <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
          <ClipboardList className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">
            {search
              ? 'Chưa tìm thấy hồ sơ phù hợp.'
              : pendingOnly
                ? 'Chưa có hồ sơ cần xử lý trong danh sách này.'
                : 'Chưa có hồ sơ trong danh sách này.'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Thử từ khóa khác hoặc chọn tất cả trạng thái để xem lịch sử.
          </p>
          {pendingOnly && (
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => setPendingOnly(false)}
            >
              Xem tất cả trạng thái
            </Button>
          )}
        </div>
      )}
      {!preview &&
        data.pagination &&
        active !== 'report' &&
        active !== 'policies' && (
          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
            <p className="text-xs text-muted-foreground">
              Trang {page} · Tối đa {pageSize} hồ sơ mỗi nhóm. Hồ sơ chờ xử lý
              được ưu tiên trước.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || workspace.isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                Trang trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total || workspace.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau
              </Button>
            </div>
          </footer>
        )}
      {workspace.isFetching && !workspace.isPending && (
        <output className="text-xs text-muted-foreground">
          Đang làm mới danh sách…
        </output>
      )}
      {active === 'report' && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <label
              className="text-sm font-medium"
              htmlFor="school-report-period"
            >
              Kỳ báo cáo
            </label>
            <Input
              id="school-report-period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-44"
            />
          </div>
          {report.error && (
            <p role="alert" className="text-red-600">
              {report.error.message}
            </p>
          )}
          {report.isPending && <output>Đang tổng hợp báo cáo…</output>}
          {report.data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Trường còn trống', report.data.available_schools],
                  ['Lượt tiếp cận hết hạn', report.data.expired_approaches],
                  ['Hợp đồng hoạt động', report.data.active_contracts],
                  [
                    'Hồ sơ quá hạn',
                    report.data.overdue_proposals +
                      report.data.overdue_extensions,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border bg-card p-5">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-3 text-3xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              {report.data.net_collected_revenue !== null && (
                <p className="rounded-xl border bg-card p-4 text-sm">
                  Thực thu gộp{' '}
                  {channelMoney(report.data.collected_revenue ?? 0)} · Đã hoàn{' '}
                  {channelMoney(report.data.refunded_revenue ?? 0)} · Thu ròng{' '}
                  {channelMoney(report.data.net_collected_revenue)}
                </p>
              )}
              <div className="overflow-x-auto rounded-2xl border bg-card">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <caption className="p-4 text-left font-semibold">
                    Theo dõi phân bổ theo Quản lý và nhân sự
                  </caption>
                  <thead className="bg-muted/50">
                    <tr>
                      {[
                        'Quản lý',
                        'Nhân sự nhận',
                        'Đã mời',
                        'Đã nhận',
                        'Từ chối',
                        'Đã hủy',
                      ].map((h) => (
                        <th key={h} className="p-3 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.allocation_performance.map((r, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">{r.manager_name}</td>
                        <td className="p-3">{r.assignee_name}</td>
                        <td className="p-3">{r.invited}</td>
                        <td className="p-3">{r.accepted}</td>
                        <td className="p-3">{r.declined}</td>
                        <td className="p-3">{r.cancelled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
      <Dialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          {action && (
            <SchoolActionForm
              key={action.path + action.title}
              action={action}
              save={save}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={history !== null}
        onOpenChange={(open) => !open && setHistory(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogTitle>Lịch sử xử lý</DialogTitle>
          <DialogDescription>{history?.name}</DialogDescription>
          {historyQuery.isPending && <p>Đang tải lịch sử…</p>}
          {historyQuery.error && (
            <p role="alert" className="text-red-600">
              {historyQuery.error.message}
            </p>
          )}
          {historyQuery.data?.data.map((e) => {
            let note = '';
            try {
              const v = JSON.parse(e.new_values ?? '{}') as Record<
                string,
                unknown
              >;
              const reason = v.reason ?? v.ResponseReason;
              note = typeof reason === 'string' ? reason : '';
            } catch {
              /* Historical payloads may be absent. */
            }
            return (
              <div
                key={e.id}
                className="border-l-2 border-violet-200 py-2 pl-4"
              >
                <p className="font-medium">
                  {actionLabels[e.action] ?? 'Cập nhật hồ sơ'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.actor_name} · {workflowDate(e.created_at)}
                </p>
                {note && <p className="mt-2 text-sm">{note}</p>}
              </div>
            );
          })}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkflowCard({
  title,
  subtitle,
  status,
  due,
  overdue,
  children,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  due?: string;
  overdue?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold leading-snug">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {status && (
          <Badge
            variant="outline"
            className={
              overdue ? 'border-amber-300 bg-amber-50 text-amber-800' : ''
            }
          >
            {workflowLabels[status] ?? status}
          </Badge>
        )}
      </div>
      {due && (
        <p
          className={
            'flex items-center gap-1.5 text-xs ' +
            (overdue ? 'font-medium text-amber-700' : 'text-muted-foreground')
          }
        >
          <Clock3 className="size-3.5" />
          {overdue ? 'Quá hạn · ' : 'Hẹn xử lý · '}
          {workflowDate(due)}
        </p>
      )}
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </article>
  );
}
export function EvidenceReference({ value }: { value: string }) {
  let link = false;
  try {
    link = new URL(value).protocol === 'https:';
  } catch {
    /* Internal document reference. */
  }
  return (
    <p className="break-words text-xs text-muted-foreground">
      Bằng chứng:{' '}
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-violet-600 underline underline-offset-2"
        >
          Mở chứng từ
        </a>
      ) : (
        value
      )}
    </p>
  );
}
const actionLabels: Record<string, string> = {
  SUBMIT_SCHOOL_PROPOSAL: 'Gửi đề xuất trường',
  MANAGER_REVIEW_SCHOOL_PROPOSAL: 'Quản lý xét đề xuất',
  ADMIN_REVIEW_SCHOOL_PROPOSAL: 'Admin xét đề xuất',
  INVITE_SCHOOL_COLLABORATOR: 'Gửi lời mời nhận trường',
  RESPOND_SCHOOL_INVITATION: 'Phản hồi phân bổ',
  CANCEL_SCHOOL_INVITATION: 'Hủy lời mời',
  REQUEST_SCHOOL_EXTENSION: 'Gửi yêu cầu gia hạn',
  REVIEW_SCHOOL_EXTENSION: 'Xét gia hạn',
  OPEN_SCHOOL_DISPUTE: 'Mở tranh chấp',
  RESOLVE_SCHOOL_DISPUTE: 'Kết luận tranh chấp',
  CREATE_CUSTOMER_SUPPORT_CASE: 'Tiếp nhận yêu cầu hỗ trợ',
  UPDATE_CUSTOMER_SUPPORT_CASE: 'Cập nhật xử lý hỗ trợ',
};
