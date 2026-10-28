'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { readSchoolDemo } from '@/lib/school-demo';
import {
  workflowDate,
  workflowLabels,
  workflowFormValue,
  vietnamDateTimeInput,
  type SchoolOperationsWorkspace,
} from '@/lib/school-operations';
import { SchoolActionForm, type SchoolAction } from './school-action-form';
import { EvidenceReference } from './school-operations';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  GraduationCap,
  Search,
  ShieldCheck,
  UsersRound,
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
  channelRequest,
  channelQueryKeys,
} from '@/lib/channel-operations';

type Props = {
  apiBase: string;
  token: string;
  abilities: string[];
  onChanged: () => Promise<void>;
  adminMode?: boolean;
};
type School = {
  id: number;
  school_code: string;
  customer_id: number;
  display_name: string;
  province: string;
  ward: string;
  branches: number;
  visible_status: string;
  protected_until: string | null;
  can_register: boolean;
  contract_id: number | null;
  contract_status: string | null;
};
type SchoolList = {
  data: School[];
  total: number;
  page: number;
  page_size: number;
};
type Capacity = {
  id: number;
  name: string;
  organization_name: string;
  school_approach_limit: number;
  active: number;
  history: {
    previous_limit: number;
    new_limit: number;
    reason: string;
    created_at: string;
  }[];
};
type Preview = {
  file_hash: string;
  schools: number;
  branches: number;
  rows: number;
  existing_schools: number;
  warnings: { row: number; code: string; message: string }[];
  sample: {
    row: number;
    name: string;
    school_code: string;
    unit_type: string;
    ward: string;
  }[];
};
type Detail = {
  id: number;
  school_code: string;
  customer_id: number;
  display_name: string;
  registration_id: number | null;
  protected_until: string | null;
  can_report_contract: boolean;
  can_activity: boolean;
  can_request_extension?: boolean;
  can_allocate?: boolean;
  can_dispute?: boolean;
  packages: { id: number; name: string; list_price: number }[];
  units: {
    id: number;
    version: number;
    can_edit: boolean;
    unit_type: string;
    name: string;
    province: string;
    ward: string;
    address: string | null;
    contact_name: string | null;
    contact_position: string | null;
    contact_phone: string | null;
    school_phone: string | null;
    email: string | null;
    note: string | null;
  }[];
  contracts: {
    id: number;
    contract_code: string;
    status: string;
    verified_at: string | null;
    protection_until: string | null;
    can_review: boolean;
    can_grant: boolean;
    evidence_reference?: string | null;
  }[];
  activities: {
    activity_type: string;
    content: string;
    created_at: string;
    next_follow_up_at: string | null;
    occurred_at?: string | null;
    contact_name?: string | null;
    contact_position?: string | null;
    feedback?: string | null;
    commitment?: string | null;
  }[];
};
type Command = { path: string; body?: unknown; method?: string };
const labels: Record<string, string> = {
  AVAILABLE: 'Chưa đăng ký',
  APPROACHING: 'Đang tiếp cận',
  CONTRACTED: 'Đã xác minh hợp đồng',
  PENDING_REVIEW: 'Chờ quản lý kiểm tra',
  MANAGER_REVIEWED: 'Chờ CHECKEE xác minh',
  PENDING_KIDSFIT: 'Chờ KIDSFIT ghi nhận',
  ACTIVE: 'Bảo vệ đã có hiệu lực',
};
const key = () => crypto.randomUUID();

export function SchoolDirectory({
  apiBase,
  token,
  abilities,
  onChanged,
  adminMode = false,
}: Props) {
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importKey, setImportKey] = useState(key);
  const [importOpen, setImportOpen] = useState(false);
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [notice, setNotice] = useState('');
  const client = useQueryClient();
  const demo = !apiBase;
  const can = (code: string) => !demo && abilities.includes(code);
  const api = <T,>(path: string, options?: RequestInit) =>
    demo
      ? readSchoolDemo<T>(path)
      : channelRequest<T>(apiBase, token, path, options);
  const schools = useQuery({
    queryKey: [...channelQueryKeys.all, 'schools', search, page],
    queryFn: () =>
      api<SchoolList>(
        `/schools?search=${encodeURIComponent(search)}&page=${page}`,
      ),
  });
  const capacities = useQuery({
    queryKey: [...channelQueryKeys.all, 'school-capacities'],
    queryFn: () => api<{ data: Capacity[] }>('/school-capacities'),
    enabled: !adminMode && can('channel_sales.school.capacity.manage'),
  });
  const detail = useQuery({
    queryKey: [...channelQueryKeys.all, 'school', selected],
    queryFn: () => api<Detail>(`/schools/${selected}`),
    enabled: selected !== null,
  });
  const mutation = useMutation({
    mutationFn: ({ path, body, method }: Command) =>
      api(path, { method: method ?? 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: channelQueryKeys.all });
      await onChanged();
      setNotice('Đã lưu thay đổi và lịch sử xử lý.');
    },
  });
  const upload = useMutation({
    mutationFn: async (commit: boolean) => {
      if (!file) throw new Error('Vui lòng chọn file Excel.');
      const body = new FormData();
      body.set('file', file);
      if (commit) {
        body.set('preview_hash', preview?.file_hash ?? '');
        body.set('idempotency_key', importKey);
      }
      return api<
        Preview & { data?: { schools_created: number; units_created: number } }
      >(`/schools/import/${commit ? 'commit' : 'preview'}`, {
        method: 'POST',
        body,
      });
    },
    onSuccess: async (result, commit) => {
      if (!commit) {
        setPreview(result);
        return;
      }
      await client.invalidateQueries({ queryKey: channelQueryKeys.all });
      await onChanged();
      setImportOpen(false);
      setFile(null);
      setPreview(null);
      setNotice(
        `Đã nhập ${result.data?.schools_created ?? 0} trường mới và ${result.data?.units_created ?? 0} đơn vị mới. Dữ liệu cũ được giữ nguyên.`,
      );
    },
  });
  const run = (command: Command) => mutation.mutateAsync(command);
  return (
    <div className="space-y-5">
      {demo && (
        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Danh bạ minh họa chỉ đọc, không chứa dữ liệu trường thật. Nhập Excel,
          đăng ký tiếp cận và xác minh hợp đồng dùng bản CRM kết nối .NET
          API/MySQL.
        </aside>
      )}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-gradient-to-br from-violet-50/70 to-card p-6 dark:from-violet-950/20">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-950">
            <GraduationCap className="size-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Danh bạ trường học</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Trường chính và phân hiệu dùng chung quyền bảo vệ khách hàng.
            </p>
          </div>
        </div>
        {can('channel_sales.school.directory.manage') && (
          <Button
            onClick={() => {
              setImportOpen(true);
              upload.reset();
            }}
          >
            <FileSpreadsheet className="size-4" /> Nhập danh sách Excel
          </Button>
        )}
      </header>
      {notice && (
        <output className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {notice}
        </output>
      )}
      {(schools.error || mutation.error || capacities.error) && (
        <ErrorText>
          {schools.error?.message ??
            mutation.error?.message ??
            capacities.error?.message}
        </ErrorText>
      )}
      {!adminMode && !!capacities.data?.data.length && (
        <section className="rounded-2xl border bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <UsersRound className="size-4" /> Hạn mức tiếp cận của CTV
          </h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {capacities.data.data.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.organization_name}
                    </p>
                  </div>
                  <strong
                    className={
                      item.active >= item.school_approach_limit
                        ? 'text-amber-600'
                        : 'text-violet-600'
                    }
                  >
                    {item.active}/{item.school_approach_limit}
                  </strong>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Trường đang được bảo vệ • không tính từng phân hiệu
                </p>
                {can('channel_sales.school.capacity.manage') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setCapacity(item)}
                  >
                    Điều chỉnh hạn mức
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <form
            className="flex w-full max-w-lg gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(term);
              setPage(1);
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute top-3 left-3 size-4 text-muted-foreground" />
              <Input
                aria-label="Tìm trường, mã hoặc khu vực"
                className="pl-9"
                placeholder="Tên trường, mã trường, phường/xã…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" type="submit">
              Tìm kiếm
            </Button>
            <Button variant="outline" type="button" onClick={() => { setTerm(''); setSearch(''); setPage(1); }}>Reset bộ lọc</Button>
          </form>
          <span className="text-sm text-muted-foreground">
            {schools.data?.total ?? 0} trường chính
          </span>
        </div>
        {schools.isPending ? (
          <p className="p-8 text-sm text-muted-foreground">Đang tải danh bạ…</p>
        ) : schools.data?.data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-4">Trường học</th>
                  <th className="p-4">Khu vực</th>
                  <th className="p-4">Phân hiệu</th>
                  <th className="p-4">Quyền bảo vệ</th>
                  <th className="p-4">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {schools.data.data.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t transition-colors hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <button
                        className="text-left font-semibold hover:text-violet-600"
                        onClick={() => setSelected(s.id)}
                      >
                        {s.display_name}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.school_code}
                      </p>
                      {s.contract_status && (
                        <p className="mt-1 text-xs text-violet-600">
                          {labels[s.contract_status] ?? s.contract_status}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {s.ward}
                      <br />
                      {s.province}
                    </td>
                    <td className="p-4">{s.branches}</td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={
                          s.visible_status === 'AVAILABLE'
                            ? 'text-emerald-700'
                            : 'text-violet-600'
                        }
                      >
                        {labels[s.visible_status]}
                      </Badge>
                      {s.protected_until && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Đến {channelDate(s.protected_until)}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(s.id)}
                        >
                          Chi tiết
                        </Button>
                        {!adminMode && s.can_register && (
                          <Button
                            size="sm"
                            disabled={mutation.isPending}
                            onClick={() =>
                              run({
                                path: '/approach-registrations',
                                body: {
                                  idempotency_key: key(),
                                  customer_id: s.customer_id,
                                  source: 'SCHOOL_DIRECTORY',
                                },
                              }).catch(() => undefined)
                            }
                          >
                            Đăng ký tiếp cận
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Building2 className="mx-auto mb-3 size-9 text-muted-foreground/50" />
            <p className="font-medium">
              {search
                ? 'Không tìm thấy trường phù hợp'
                : 'Chưa có danh bạ trường học'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {search
                ? 'Thử tìm theo mã trường hoặc phường/xã.'
                : 'Admin nhập file Excel để tạo danh sách chính thức.'}
            </p>
          </div>
        )}
        <footer className="flex items-center justify-between border-t p-4 text-sm">
          <span>
            Trang {page} /{' '}
            {Math.max(1, Math.ceil((schools.data?.total ?? 0) / 20))}
          </span>
          <div className="flex gap-2">
            <Button
              aria-label="Trang trước"
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              aria-label="Trang sau"
              variant="outline"
              size="sm"
              disabled={page * 20 >= (schools.data?.total ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </footer>
      </section>
      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          if (!upload.isPending) setImportOpen(open);
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>Nhập danh bạ trường học</DialogTitle>
          <DialogDescription>
            File .xlsx tối đa 2 MB, sheet DANH_SACH_TRUONG, đúng 12 cột của mẫu.
            Xem trước không thay đổi dữ liệu.
          </DialogDescription>
          <Input
            type="file"
            accept=".xlsx"
            aria-label="Chọn file danh sách trường"
            disabled={upload.isPending}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setImportKey(key());
              setPreview(null);
              upload.reset();
            }}
          />
          {upload.error && <ErrorText>{upload.error.message}</ErrorText>}
          <Button
            variant="outline"
            disabled={!file || upload.isPending}
            onClick={() => upload.mutate(false)}
          >
            Kiểm tra và xem trước
          </Button>
          {preview && (
            <>
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted p-4 text-center text-sm">
                <div>
                  <strong className="block text-xl">{preview.schools}</strong>
                  Trường chính
                </div>
                <div>
                  <strong className="block text-xl">{preview.branches}</strong>
                  Phân hiệu
                </div>
                <div>
                  <strong className="block text-xl">
                    {preview.existing_schools}
                  </strong>
                  Trường đã có
                </div>
              </div>
              <p className="text-sm">
                Không tự gộp phân hiệu trùng tên, không ghi đè trường đã có.
                Thông tin để trống được giữ nguyên.
              </p>
              <div className="max-h-44 overflow-auto rounded-xl border p-3 text-xs">
                <p className="mb-2 font-semibold">
                  {preview.warnings.length} cảnh báo cần rà soát
                </p>
                {preview.warnings.map((w, i) => (
                  <p key={`${w.row}-${i}`} className="py-1">
                    Dòng {w.row}: {w.message}
                  </p>
                ))}
              </div>
              <Button
                disabled={upload.isPending}
                onClick={() => upload.mutate(true)}
              >
                {upload.isPending
                  ? 'Đang nhập…'
                  : `Xác nhận nhập ${preview.rows} dòng`}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogTitle>
            {detail.data?.display_name ?? 'Hồ sơ trường học'}
          </DialogTitle>
          <DialogDescription>
            {detail.data?.school_code} · Bảo vệ theo trường chính, không đăng ký
            riêng từng phân hiệu.
          </DialogDescription>
          {detail.error && <ErrorText>{detail.error.message}</ErrorText>}
          {detail.isPending ? (
            <p>Đang tải hồ sơ…</p>
          ) : (
            detail.data && (
              <SchoolDetail
                apiBase={apiBase}
                token={token}
                data={detail.data}
                run={run}
                busy={mutation.isPending}
                adminMode={adminMode}
              />
            )
          )}
          {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!capacity}
        onOpenChange={(open) => {
          if (!open) setCapacity(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Hạn mức trường của {capacity?.name}</DialogTitle>
          <DialogDescription>
            Giảm hạn mức không thu hồi quyền bảo vệ hiện tại. CTV chỉ nhận thêm
            khi còn suất.
          </DialogDescription>
          {capacity && (
            <CapacityForm
              key={capacity.id}
              item={capacity}
              save={async (body) => {
                await run({
                  path: `/school-capacities/${capacity.id}`,
                  method: 'PATCH',
                  body,
                });
                setCapacity(null);
              }}
            />
          )}
          {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SchoolDetail({
  apiBase,
  token,
  data,
  run,
  busy,
  adminMode = false,
}: {
  apiBase: string;
  token: string;
  data: Detail;
  run: (command: Command) => Promise<unknown>;
  busy: boolean;
  adminMode?: boolean;
}) {
  const [action, setAction] = useState<SchoolAction | null>(null);
  const [historyUnit, setHistoryUnit] = useState<number | null>(null);
  const [showRights, setShowRights] = useState(false);
  const options = useQuery({
    queryKey: [...channelQueryKeys.all, 'school-operations'],
    queryFn: () =>
      channelRequest<SchoolOperationsWorkspace>(
        apiBase,
        token,
        '/school-operations',
      ),
    enabled: !!apiBase && !!data.can_allocate,
  });
  const revisions = useQuery({
    queryKey: [...channelQueryKeys.all, 'school-unit-history', historyUnit],
    queryFn: () =>
      channelRequest<{
        data: {
          id: number;
          version: number;
          reason: string;
          before_values: string;
          after_values: string;
          created_at: string;
          actor_name: string;
        }[];
      }>(apiBase, token, '/school-units/' + historyUnit + '/history'),
    enabled: !!apiBase && historyUnit !== null,
  });
  const rights = useQuery({
    queryKey: [...channelQueryKeys.all, 'school-rights', data.id],
    queryFn: () =>
      channelRequest<{
        data: {
          id: number | null;
          owner_name: string;
          registered_at: string;
          protected_until: string;
          status: string;
        }[];
        allocations: {
          id: number;
          status: string;
          reason: string;
          response_reason: string | null;
          assigned_by: string;
          assignee_name: string;
        }[];
      }>(apiBase, token, '/schools/' + data.id + '/rights'),
    enabled: !!apiBase && showRights,
  });
  const editUnit = (unit: Detail['units'][number]) =>
    setAction({
      title: 'Chỉnh dữ liệu đơn vị',
      path: '/school-units/' + unit.id,
      method: 'PATCH',
      description:
        'Lưu lý do và phiên bản trước/sau. Nếu có người sửa trước, hệ thống yêu cầu tải lại để đối chiếu.',
      preset: { expected_version: unit.version },
      fields: [
        { name: 'name', label: 'Tên đơn vị', value: unit.name },
        { name: 'province', label: 'Tỉnh / thành phố', value: unit.province },
        { name: 'ward', label: 'Phường / xã', value: unit.ward },
        {
          name: 'address',
          label: 'Địa chỉ',
          optional: true,
          value: unit.address ?? '',
        },
        {
          name: 'contact_name',
          label: 'Người liên hệ',
          optional: true,
          value: unit.contact_name ?? '',
        },
        {
          name: 'contact_position',
          label: 'Chức vụ',
          optional: true,
          value: unit.contact_position ?? '',
        },
        {
          name: 'contact_phone',
          label: 'Điện thoại liên hệ',
          optional: true,
          value: unit.contact_phone ?? '',
        },
        {
          name: 'school_phone',
          label: 'Điện thoại trường',
          optional: true,
          value: unit.school_phone ?? '',
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          optional: true,
          value: unit.email ?? '',
        },
        {
          name: 'note',
          label: 'Ghi chú',
          type: 'textarea',
          optional: true,
          value: unit.note ?? '',
        },
        { name: 'reason', label: 'Lý do chỉnh sửa', type: 'textarea' },
      ],
    });
  if (action)
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setAction(null)}>
          ← Quay lại hồ sơ
        </Button>
        <SchoolActionForm
          key={action.path + action.title}
          action={action}
          inline
          save={async (command) => {
            await run(command);
            setAction(null);
          }}
        />
      </div>
    );
  return (
    <div className="space-y-5">
      {!!apiBase && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRights((v) => !v)}
          >
            Lịch sử quyền & phân bổ
          </Button>
          {!adminMode && data.can_request_extension && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setAction({
                  title: 'Xin gia hạn tiếp cận',
                  path:
                    '/approaches/' +
                    data.registration_id +
                    '/extension-requests',
                  description:
                    'Gửi trước khi hết hạn. Chờ duyệt không giữ chỗ; cần có tiến độ, bằng chứng và lịch hẹn.',
                  fields: [
                    {
                      name: 'requested_until',
                      label: 'Xin gia hạn đến',
                      type: 'datetime-local',
                    },
                    {
                      name: 'review_due_at',
                      label: 'Đề nghị phản hồi trước',
                      type: 'datetime-local',
                    },
                    {
                      name: 'next_appointment_at',
                      label: 'Lịch hẹn / giới thiệu sản phẩm',
                      type: 'datetime-local',
                    },
                    {
                      name: 'evidence_reference',
                      label: 'Mã chứng từ / tham chiếu bằng chứng',
                    },
                    {
                      name: 'progress',
                      label: 'Tiến độ và lý do cần gia hạn',
                      type: 'textarea',
                    },
                  ],
                })
              }
            >
              Xin gia hạn
            </Button>
          )}
          {!adminMode && data.can_allocate && (
            <Button
              size="sm"
              variant="outline"
              disabled={!options.data}
              onClick={() =>
                setAction({
                  title: 'Mời nhân sự nhận trường',
                  path: '/school-invitations',
                  description:
                    'Lời mời chưa tạo quyền bảo vệ. Người nhận cần phản hồi và còn đủ hạn mức.',
                  preset: { school_id: data.id },
                  fields: [
                    {
                      name: 'assignee_member',
                      label: 'Nhân sự nhận trường',
                      type: 'number',
                      options: options
                        .data!.team.filter((m) => m.can_receive_school)
                        .map((m) => ({
                          value: String(m.id),
                          label:
                            m.name +
                            ' · ' +
                            (options.data!.organizations.find(
                              (o) => o.id === m.organization_id,
                            )?.name ?? ''),
                        })),
                    },
                    {
                      name: 'respond_by',
                      label: 'Hạn phản hồi đề nghị',
                      type: 'datetime-local',
                    },
                    {
                      name: 'reason',
                      label: 'Lý do phân bổ',
                      type: 'textarea',
                    },
                  ],
                  prepare: (body) => {
                    const member = options.data!.team.find(
                      (m) => m.id === body.assignee_member,
                    );
                    if (!member)
                      throw new Error('Cần chọn nhân sự nhận trường.');
                    return {
                      ...body,
                      assignee_user_id: member.user_id,
                      organization_id: member.organization_id,
                    };
                  },
                })
              }
            >
              Phân bổ trường
            </Button>
          )}
          {data.can_allocate && (
            <Button
              size="sm"
              variant="outline"
              disabled={!options.data}
              onClick={() =>
                setAction({
                  title: 'Lên lịch rà soát trường',
                  path: '/school-deferrals',
                  description:
                    'Dùng khi trường xa hoặc chưa có người nhận; không giữ quyền tiếp cận.',
                  preset: { school_id: data.id },
                  fields: [
                    {
                      name: 'organization_id',
                      label: 'Tổ chức phụ trách',
                      type: 'number',
                      options: options.data!.organizations.map((o) => ({
                        value: String(o.id),
                        label: o.name,
                      })),
                    },
                    {
                      name: 'review_at',
                      label: 'Rà soát lại vào',
                      type: 'datetime-local',
                    },
                    {
                      name: 'reason',
                      label: 'Lý do / phương án tư vấn từ xa',
                      type: 'textarea',
                    },
                  ],
                })
              }
            >
              Hẹn rà soát
            </Button>
          )}
          {data.can_dispute && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setAction({
                  title: 'Phản ánh quyền / phân bổ',
                  path: '/school-disputes',
                  description:
                    'Ban giám đốc xem lịch sử, bằng chứng và lưu kết luận. Gửi phản ánh không tự thay đổi quyền hiện tại.',
                  preset: { customer_id: data.customer_id },
                  fields: [
                    {
                      name: 'reason',
                      label: 'Nội dung phản ánh',
                      type: 'textarea',
                    },
                    {
                      name: 'evidence_reference',
                      label: 'Bằng chứng / hồ sơ tham chiếu',
                    },
                  ],
                })
              }
            >
              Gửi phản ánh
            </Button>
          )}
        </div>
      )}
      {options.error && <ErrorText>{options.error.message}</ErrorText>}
      {showRights && (
        <section className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <h3 className="font-semibold">Lịch sử quyền tiếp cận</h3>
          {rights.isPending && <p>Đang tải…</p>}
          {rights.error && <ErrorText>{rights.error.message}</ErrorText>}
          {rights.data?.data.map((r, i) => (
            <p key={r.id ?? i} className="text-sm">
              {r.owner_name} · {workflowDate(r.registered_at)} →{' '}
              {workflowDate(r.protected_until)} ·{' '}
              {workflowLabels[r.status] ?? r.status}
            </p>
          ))}
          {rights.data?.allocations.map((a) => (
            <p key={a.id} className="border-t pt-2 text-sm">
              {a.assigned_by} → {a.assignee_name} ·{' '}
              {workflowLabels[a.status] ?? a.status}
              <span className="block text-xs text-muted-foreground">
                {a.reason}
                {a.response_reason ? ' · ' + a.response_reason : ''}
              </span>
            </p>
          ))}
          {rights.data?.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Trường chưa có lượt tiếp cận.
            </p>
          )}
        </section>
      )}
      <div className="space-y-2">
        {data.units.map((unit) => (
          <section key={unit.id} className="rounded-xl border p-4">
            <p className="font-semibold">
              {unit.name}{' '}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {unit.unit_type === 'MAIN' ? 'Trường chính' : 'Phân hiệu'}
              </span>
            </p>
            {unit.can_edit && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => editUnit(unit)}
                >
                  Chỉnh thông tin
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setHistoryUnit(historyUnit === unit.id ? null : unit.id)
                  }
                >
                  Lịch sử chỉnh sửa
                </Button>
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {unit.address ?? `${unit.ward}, ${unit.province}`}
            </p>
            {unit.contact_name && (
              <p className="mt-2 text-sm">
                {unit.contact_name} · {unit.contact_position}
              </p>
            )}
            {(unit.contact_phone || unit.school_phone || unit.email) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Liên hệ: {unit.contact_phone ?? 'Chưa có'} · SĐT trường:{' '}
                {unit.school_phone ?? 'Chưa có'}
                {unit.email && ` · ${unit.email}`}
              </p>
            )}
          </section>
        ))}
      </div>
      {historyUnit !== null && (
        <section className="space-y-4 rounded-xl border p-4">
          <h3 className="font-semibold">Lịch sử chỉnh dữ liệu</h3>
          {revisions.isPending && <p>Đang tải…</p>}
          {revisions.error && <ErrorText>{revisions.error.message}</ErrorText>}
          {revisions.data?.data.map((r) => (
            <Revision key={r.id} item={r} />
          ))}
          {revisions.data?.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Chưa có lần chỉnh sửa sau nhập.
            </p>
          )}
        </section>
      )}
      {data.contracts.map((c) => (
        <section
          key={c.id}
          className="rounded-xl border bg-violet-50/30 p-4 dark:bg-violet-950/20"
        >
          <h3 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" /> {c.contract_code}
          </h3>
          <p className="mt-2 text-sm">{labels[c.status] ?? c.status}</p>
          {c.evidence_reference && (
            <div className="mt-2">
              <EvidenceReference value={c.evidence_reference} />
            </div>
          )}
          {c.protection_until ? (
            <p className="mt-1 text-xs">
              Bảo vệ đến {channelDate(c.protection_until)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Chưa ghi nhận quyền bảo vệ dài hạn.{' '}
              {c.verified_at &&
                `Đã xác minh ngày ${channelDate(c.verified_at)}.`}
            </p>
          )}
          {c.can_review && (
            <Button
              className="mt-3"
              disabled={busy}
              onClick={() =>
                run({ path: `/school-contracts/${c.id}/review` }).catch(
                  () => undefined,
                )
              }
            >
              Quản lý xác nhận đã kiểm tra
            </Button>
          )}
          {c.can_grant && (
            <Button
              className="mt-3"
              disabled={busy}
              onClick={() =>
                run({
                  path: `/school-contracts/${c.id}/grant-protection`,
                }).catch(() => undefined)
              }
            >
              KIDSFIT ghi nhận bảo vệ 5 năm
            </Button>
          )}
        </section>
      ))}
      {!adminMode && data.can_activity && (
        <ActivityForm
          save={(body) =>
            run({
              path: `/approach-registrations/${data.registration_id}/activities`,
              body,
            })
          }
        />
      )}
      {!adminMode && data.can_report_contract && (
        <ContractForm
          data={data}
          save={(body) =>
            run({
              path: `/approach-registrations/${data.registration_id}/report-contract`,
              body,
            })
          }
        />
      )}
      {!!data.activities.length && (
        <section>
          <h3 className="mb-3 font-semibold">Lịch sử làm việc</h3>
          <div className="max-h-60 space-y-3 overflow-auto">
            {data.activities.map((a, i) => (
              <div
                key={`${a.created_at}-${i}`}
                className="border-l-2 border-violet-200 pl-3"
              >
                <p className="whitespace-pre-wrap text-sm">{a.content}</p>
                {a.contact_name && (
                  <p className="mt-1 text-xs">
                    Trao đổi với {a.contact_name}
                    {a.contact_position ? ' · ' + a.contact_position : ''}
                  </p>
                )}
                {a.feedback && (
                  <p className="mt-1 text-xs">Phản hồi: {a.feedback}</p>
                )}
                {a.commitment && (
                  <p className="mt-1 text-xs">Cam kết: {a.commitment}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {workflowDate(a.occurred_at ?? a.created_at)}
                  {a.next_follow_up_at &&
                    ` · Hẹn tiếp ${channelDate(a.next_follow_up_at)}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
function Revision({
  item,
}: {
  item: {
    version: number;
    reason: string;
    before_values: string;
    after_values: string;
    actor_name: string;
    created_at: string;
  };
}) {
  const display = (value: unknown) =>
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '—';
  let before: Record<string, unknown> = {},
    after: Record<string, unknown> = {};
  try {
    before = JSON.parse(item.before_values);
    after = JSON.parse(item.after_values);
  } catch {
    return <p>Không đọc được phiên bản lịch sử này.</p>;
  }
  const labels: Record<string, string> = {
    Name: 'Tên đơn vị',
    Province: 'Tỉnh / thành phố',
    Ward: 'Phường / xã',
    Address: 'Địa chỉ',
    ContactName: 'Người liên hệ',
    ContactPosition: 'Chức vụ',
    ContactPhone: 'Điện thoại liên hệ',
    Email: 'Email',
    SchoolPhone: 'Điện thoại trường',
    Note: 'Ghi chú',
  };
  return (
    <article className="space-y-2 border-t pt-3">
      <p className="text-sm font-medium">
        Phiên bản {item.version} · {item.actor_name}
      </p>
      <p className="text-xs text-muted-foreground">
        {workflowDate(item.created_at)} · {item.reason}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="p-2">Thông tin</th>
              <th className="p-2">Trước</th>
              <th className="p-2">Sau</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(after)
              .filter((field) => before[field] !== after[field])
              .map((field) => (
                <tr key={field} className="border-t">
                  <td className="p-2">{labels[field] ?? 'Thông tin'}</td>
                  <td className="break-words p-2 text-muted-foreground">
                    {display(before[field])}
                  </td>
                  <td className="break-words p-2">{display(after[field])}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
const capacitySchema = z.object({
  limit: z.number().int().min(0).max(1000),
  reason: z.string().trim().min(3, 'Nhập lý do ít nhất 3 ký tự.').max(2000),
});
function CapacityForm({
  item,
  save,
}: {
  item: Capacity;
  save: (body: z.infer<typeof capacitySchema>) => Promise<void>;
}) {
  const form = useForm({
    resolver: zodResolver(capacitySchema),
    defaultValues: { limit: item.school_approach_limit, reason: '' },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (values) => {
        await save(values).catch(() => undefined);
      })}
    >
      <Field label="Số trường tối đa">
        <Input
          type="number"
          min={0}
          max={1000}
          {...form.register('limit', { valueAsNumber: true })}
        />
      </Field>
      <Field label="Lý do thay đổi">
        <Input {...form.register('reason')} />
      </Field>
      <FormErrors errors={form.formState.errors} />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Lưu hạn mức
      </Button>
      {item.history.map((h, i) => (
        <p key={i} className="border-t pt-2 text-xs text-muted-foreground">
          {h.previous_limit} → {h.new_limit} · {channelDate(h.created_at)}
          <br />
          {h.reason}
        </p>
      ))}
    </form>
  );
}
const activitySchema = z.object({
  activity_type: z.string(),
  content: z.string().trim().min(3, 'Nhập báo cáo làm việc.').max(4000),
  next_follow_up_at: z.string(),
  occurred_at: z.string(),
  contact_name: z.string().max(500),
  contact_position: z.string().max(120),
  feedback: z.string().max(2000),
  commitment: z.string().max(2000),
});
function ActivityForm({ save }: { save: (body: unknown) => Promise<unknown> }) {
  const form = useForm({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      activity_type: 'CALL',
      content: '',
      next_follow_up_at: '',
      occurred_at: vietnamDateTimeInput(new Date().toISOString()),
      contact_name: '',
      contact_position: '',
      feedback: '',
      commitment: '',
    },
  });
  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await save({
            ...values,
            occurred_at: workflowFormValue(
              'datetime-local',
              values.occurred_at,
              true,
            ),
            next_follow_up_at: values.next_follow_up_at
              ? new Date(`${values.next_follow_up_at}:00+07:00`).toISOString()
              : null,
          });
          form.reset();
        } catch {
          /* Server error is displayed by the parent. */
        }
      })}
    >
      <h3 className="font-semibold">Báo cáo lần làm việc</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Thời điểm trao đổi (giờ Việt Nam)">
          <Input type="datetime-local" {...form.register('occurred_at')} />
        </Field>
        <Field label="Người trao đổi">
          <Input {...form.register('contact_name')} />
        </Field>
        <Field label="Chức vụ">
          <Input {...form.register('contact_position')} />
        </Field>
      </div>
      <Field label="Kênh liên hệ">
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          {...form.register('activity_type')}
        >
          <option value="CALL">Cuộc gọi</option>
          <option value="ZALO">Zalo tổ chức</option>
          <option value="MEETING">Gặp trường</option>
          <option value="DEMO">Trình diễn</option>
          <option value="NOTE">Ghi chú</option>
        </select>
      </Field>
      <Field label="Người trao đổi, tư vấn, phản hồi, vướng mắc và bước tiếp theo">
        <textarea
          className="min-h-24 w-full rounded-md border bg-background p-3 text-sm"
          {...form.register('content')}
        />
      </Field>
      <Field label="Lịch hẹn tiếp theo (giờ Việt Nam)">
        <Input type="datetime-local" {...form.register('next_follow_up_at')} />
      </Field>
      <Field label="Phản hồi của nhà trường">
        <Input {...form.register('feedback')} />
      </Field>
      <Field label="Cam kết cần theo dõi / bàn giao">
        <Input {...form.register('commitment')} />
      </Field>
      <FormErrors errors={form.formState.errors} />
      <Button
        type="submit"
        variant="outline"
        disabled={form.formState.isSubmitting}
      >
        Lưu báo cáo
      </Button>
    </form>
  );
}
const contractSchema = z.object({
  contract_code: z.string().trim().min(1, 'Nhập mã hợp đồng.'),
  signed_on: z.string().min(1, 'Chọn ngày ký.'),
  product_package_id: z.number().positive(),
  total_value: z.number().int().positive(),
  evidence_reference: z
    .string()
    .trim()
    .min(1, 'Nhập tham chiếu bằng chứng.')
    .max(500),
});
function ContractForm({
  data,
  save,
}: {
  data: Detail;
  save: (
    body: z.infer<typeof contractSchema> & { idempotency_key: string },
  ) => Promise<unknown>;
}) {
  const [requestKey] = useState(key);
  const form = useForm({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_code: '',
      signed_on: '',
      product_package_id: data.packages[0]?.id ?? 0,
      total_value: data.packages[0]?.list_price ?? 0,
      evidence_reference: '',
    },
  });
  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      onSubmit={form.handleSubmit(async (values) => {
        await save({ ...values, idempotency_key: requestKey }).catch(
          () => undefined,
        );
      })}
    >
      <h3 className="font-semibold">Báo cáo hợp đồng để xác minh</h3>
      <p className="text-xs text-muted-foreground">
        Quản lý kiểm tra → CHECKEE xác minh → KIDSFIT ghi nhận. Báo cáo chưa tạo
        bảo vệ 5 năm hoặc phiếu thu.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Mã hợp đồng">
          <Input {...form.register('contract_code')} />
        </Field>
        <Field label="Ngày ký">
          <Input type="date" {...form.register('signed_on')} />
        </Field>
        <Field label="Gói sản phẩm">
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            {...form.register('product_package_id', { valueAsNumber: true })}
          >
            {data.packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Giá trị (VND)">
          <Input
            type="number"
            min={1}
            step={1}
            {...form.register('total_value', { valueAsNumber: true })}
          />
        </Field>
      </div>
      <Field label="Tham chiếu bằng chứng hợp đồng">
        <Input
          {...form.register('evidence_reference')}
          placeholder="Mã hồ sơ hoặc đường dẫn tài liệu được phép truy cập"
        />
      </Field>
      <FormErrors errors={form.formState.errors} />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        Gửi quản lý kiểm tra
      </Button>
    </form>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200"
    >
      {children}
    </p>
  );
}
function FormErrors({ errors }: { errors: object }) {
  return (
    <>
      {Object.values(errors).map(
        (e: { message?: string }, i) =>
          e.message && (
            <p role="alert" key={i} className="text-xs text-red-600">
              {e.message}
            </p>
          ),
      )}
    </>
  );
}
