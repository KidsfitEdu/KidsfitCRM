'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { readSchoolDemo } from '@/lib/school-demo';
import {
  Building2,
  Eye,
  Pencil,
  Archive,
  UsersRound,
  Search,
  RotateCcw,
  UserRoundPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppButton } from '@/components/common/buttons/app-button';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppPageHeader } from '@/components/common/app-page-header';
import { SCHOOL_ROWS_PER_PAGE } from '@/lib/school-page-window';
import { AppEmptyState } from '@/components/common/app-empty-state';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { SchoolProfileDetails } from '@/components/crm/schools/school-profile-details';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { channelDate, channelRequest, channelQueryKeys } from '@/lib/channel-operations';
import { updateSchoolUnit, archiveSchool, restoreSchool } from '@/services/school.service';

type Props = {
  apiBase: string;
  token: string;
  abilities: string[];
  onChanged: () => Promise<void>;
  adminMode?: boolean;
  renderImportAction?: (openImport: () => void) => ReactNode;
  registrationIconOnly?: boolean;
};
type School = {
  id: number;
  school_code: string;
  is_deleted: boolean;
  customer_id: number;
  display_name: string;
  province: string;
  ward: string;
  branches: number;
  visible_status: string;
  protected_from: string | null;
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
  is_deleted: boolean;
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
  renderImportAction,
  registrationIconOnly = false,
}: Props) {
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [wardFilter, setWardFilter] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [editingUnit, setEditingUnit] = useState<Detail['units'][number] | null>(null);
  const [editUnitChoices, setEditUnitChoices] = useState<Detail['units']>([]);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<School | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [registerSchool, setRegisterSchool] = useState<School | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importKey, setImportKey] = useState(key);
  const [importOpen, setImportOpen] = useState(false);
  const [capacity, setCapacity] = useState<Capacity | null>(null);
  const [notice, setNotice] = useState('');
  const client = useQueryClient();
  const demo = !apiBase;
  const can = (code: string) => !demo && (abilities.includes('*') || abilities.includes(code));
  const canAdminManage = adminMode && can('channel_sales.school.directory.manage');
  // Only Sales/CTV directory browsers use the availability and area picker.
  const salesDirectory = !adminMode && (registrationIconOnly || abilities.includes('channel_sales.approach.register'));
  const api = <T,>(path: string, options?: RequestInit) =>
    demo
      ? readSchoolDemo<T>(path)
      : channelRequest<T>(apiBase, token, path, options);
  const areas = useQuery({
    queryKey: [...channelQueryKeys.all, 'school-areas'],
    queryFn: () => api<{ data: { province: string; ward: string }[] }>('/schools/areas'),
    enabled: salesDirectory,
  });
  const provinces = [...new Set((areas.data?.data ?? []).map(area => area.province).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const wards = [...new Set((areas.data?.data ?? []).filter(area => area.province === provinceFilter).map(area => area.ward).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const schools = useQuery({
    queryKey: [...channelQueryKeys.all, 'schools', search, page, pageSize, statusFilter, salesDirectory, provinceFilter, wardFilter],
    queryFn: () => api<SchoolList>(
      `/schools?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}&status=${encodeURIComponent(salesDirectory ? 'AVAILABLE' : statusFilter === 'DELETED' ? 'ALL' : statusFilter)}${canAdminManage && statusFilter === 'DELETED' ? '&includeDeleted=true' : ''}${salesDirectory ? `&availableOnly=true&province=${encodeURIComponent(provinceFilter)}&ward=${encodeURIComponent(wardFilter)}` : ''}`,
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
  const syncAfterSave = async () => {
    try {
      await client.invalidateQueries({ queryKey: channelQueryKeys.all });
      await onChanged();
    } catch (error) {
      if (!adminMode) throw error;
      appNotice.warning('Đã lưu dữ liệu, nhưng chưa tải lại được danh sách.', error instanceof Error ? error.message : 'Vui lòng mở lại trang để xem dữ liệu mới.');
    }
  };
  const openEditor = (unit: Detail['units'][number]) => {
    setAdminError('');
    setEditingUnit(unit);
    setEditForm({
      name: unit.name, province: unit.province, ward: unit.ward,
      address: unit.address ?? '', contact_name: unit.contact_name ?? '',
      contact_position: unit.contact_position ?? '', contact_phone: unit.contact_phone ?? '',
      school_phone: unit.school_phone ?? '', email: unit.email ?? '',
      note: unit.note ?? '',
    });
  };
  const startEditSchool = async (school: School) => {
    if (adminBusy || school.is_deleted) return;
    setAdminBusy(true);
    setAdminError('');
    try {
      const schoolDetail = await api<Detail>(`/schools/${school.id}`);
      const editableUnits = schoolDetail.units.filter(unit => unit.can_edit);
      if (!editableUnits.length) throw new Error('Không có đơn vị được phép chỉnh sửa.');
      if (editableUnits.length === 1) openEditor(editableUnits[0]);
      else setEditUnitChoices(editableUnits);
    } catch (error) {
      appNotice.error('Không mở được form chỉnh sửa.', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setAdminBusy(false);
    }
  };
  const saveEditor = async () => {
    if (!editingUnit || adminBusy) return;
    if (!editForm.name?.trim() || !editForm.province?.trim() || !editForm.ward?.trim()) {
      setAdminError('Cần điền tên, tỉnh/thành và phường/xã.'); return;
    }
    setAdminBusy(true); setAdminError('');
    try {
      await updateSchoolUnit(apiBase, token, editingUnit.id, { ...editForm, expected_version: editingUnit.version });
      setEditingUnit(null);
      appNotice.success('Đã cập nhật thông tin trường.');
      await syncAfterSave();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Không cập nhật được trường.');
    } finally { setAdminBusy(false); }
  };
  const changeArchive = async () => {
    if (!archiveTarget || adminBusy) return;
    setAdminBusy(true); setAdminError('');
    try {
      if (archiveTarget.is_deleted) await restoreSchool(apiBase, token, archiveTarget.id);
      else await archiveSchool(apiBase, token, archiveTarget.id);
      appNotice.success(archiveTarget.is_deleted ? 'Đã khôi phục trường học.' : 'Đã xóa trường học thành công.', archiveTarget.is_deleted ? undefined : 'Dữ liệu và lịch sử vẫn được lưu giữ.');
      setArchiveTarget(null);
      await syncAfterSave();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vui lòng thử lại.';
      setArchiveTarget(null);
      appNotice.error(archiveTarget.is_deleted ? 'Không thể khôi phục trường học.' : 'Không thể xóa trường học.', message);
    } finally { setAdminBusy(false); }
  };
  const mutation = useMutation({
    mutationFn: ({ path, body, method }: Command) =>
      api(path, { method: method ?? 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      await syncAfterSave();
      if (adminMode) appNotice.success('Đã lưu thay đổi trường học và lịch sử xử lý.');
      else setNotice('Đã lưu thay đổi và lịch sử xử lý.');
    },
    onError: (error) => {
      if (adminMode) appNotice.error('Không lưu được thay đổi trường học.', error instanceof Error ? error.message : 'Vui lòng thử lại.');
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
        if (adminMode) appNotice.info('Đã kiểm tra file Excel.', 'Vui lòng xem trước dữ liệu và cảnh báo trước khi xác nhận nhập.');
        return;
      }
      await syncAfterSave();
      setImportOpen(false);
      setFile(null);
      setPreview(null);
      const message = `Đã nhập ${result.data?.schools_created ?? 0} trường mới và ${result.data?.units_created ?? 0} đơn vị mới. Dữ liệu cũ được giữ nguyên.`;
      if (adminMode) appNotice.success('Import Excel thành công.', message);
      else setNotice(message);
    },
    onError: (error) => {
      if (adminMode) appNotice.error('Không thể xử lý file Excel.', error instanceof Error ? error.message : 'Vui lòng kiểm tra file và thử lại.');
    },
  });
  const run = (command: Command) => mutation.mutateAsync(command);
  const openImport = () => {setImportOpen(true);upload.reset();};
  useEffect(() => {
    if (adminMode && schools.error) appNotice.error('Không tải được danh sách trường học.', schools.error.message);
  }, [adminMode, schools.error]);
  const visibleSchools = schools.data?.data ?? [];
  return (
    <div className="space-y-5">
      {demo && (
        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Chế độ xem thử — dữ liệu mẫu chỉ đọc. Để quản lý trường thật, hãy đăng nhập hệ thống đã kết nối API.
        </aside>
      )}
      {adminMode
        ? <AppPageHeader eyebrow="Quản trị / Trường học" title="Quản lý trường học"
            description="Quản lý trường chính, phân hiệu và quyền bảo vệ khách hàng"
            actions={renderImportAction?.(openImport)}/>
        : renderImportAction?.(openImport)}
      {!adminMode && notice && (
        <output className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {notice}
        </output>
      )}
      {!adminMode && (schools.error || mutation.error || capacities.error) && (
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
                        : 'text-primary'
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
      <section className="crm-brand-surface overflow-hidden rounded-2xl border border-border/80 bg-card">

        <form className={`grid grid-cols-1 items-center gap-3 border-b border-border/80 px-5 py-5 sm:px-6 ${salesDirectory ? 'lg:grid-cols-[minmax(0,1fr)_170px_170px_auto_44px]' : 'sm:grid-cols-[minmax(0,1fr)_200px_auto_44px]'}`
          onSubmit={event => { event.preventDefault(); setSearch(term); setPage(1); }}>
          <div className="relative min-w-0">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
            <Input aria-label="Tìm tên trường, mã hoặc khu vực" className="h-11 w-full rounded-xl pl-10"
              placeholder="Tên trường, mã trường, phường/xã..." value={term} onChange={event => setTerm(event.target.value)}/>
          </div>
          {salesDirectory ? <>
            <AppNativeSelect aria-label="Lọc tỉnh/thành" containerClassName="w-full"
              value={provinceFilter} onChange={event => {setProvinceFilter(event.target.value);setWardFilter('');setPage(1);}}>
              <option value="">Tất cả tỉnh/thành</option>
              {provinces.map(value => <option key={value} value={value}>{value}</option>)}
            </AppNativeSelect>
            <AppNativeSelect aria-label="Lọc phường/xã" containerClassName="w-full"
              value={wardFilter} disabled={!provinceFilter}
              onChange={event => {setWardFilter(event.target.value);setPage(1);}}>
              <option value="">Tất cả phường/xã</option>
              {wards.map(value => <option key={value} value={value}>{value}</option>)}
            </AppNativeSelect>
          </> : <AppNativeSelect aria-label="Lọc trạng thái trường" containerClassName="w-full"
            value={statusFilter} onChange={event => {setStatusFilter(event.target.value);setPage(1);}}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">Chưa đăng ký</option>
            <option value="APPROACHING">Đang tiếp cận</option>
            <option value="CONTRACTED">Đã xác minh hợp đồng</option>
            {canAdminManage && <option value="DELETED">Đã ngừng sử dụng</option>}
          </AppNativeSelect>}
          <AppButton type="submit" tone="orange" premium className="h-10 min-w-0 justify-center gap-2 rounded-lg bg-[#d97706] px-4 font-bold text-white shadow-[0_6px_16px_rgba(217,119,6,.18)] hover:bg-[#b45309] hover:text-white dark:bg-[#d97706] dark:text-white dark:hover:bg-[#b45309] dark:hover:text-white">Tìm kiếm</AppButton>
          <AppButton type="button" tone="outline" size="icon-lg"
            className="h-11 w-11 min-w-11 rounded-lg border border-[#a5d6a7] bg-white p-0 text-[#1b5e20] hover:bg-[#1b5e20] hover:text-white dark:border-[#81c784] dark:bg-[#17341f] dark:text-[#a5d6a7] dark:hover:bg-[#1b5e20] dark:hover:text-white" aria-label="Đặt lại bộ lọc"
            title="Đặt lại bộ lọc" onClick={() => {setTerm('');setSearch('');setStatusFilter('ALL');setProvinceFilter('');setWardFilter('');setPage(1);}}>
            <RotateCcw className="size-4" aria-hidden="true"/>
          </AppButton>
        </form>
        {schools.isPending ? (
          <p className="p-8 text-sm text-muted-foreground">Đang tải danh bạ…</p>
        ) : visibleSchools.length ? (
          <div className="overflow-x-auto">
            <table className="crm-school-table w-full min-w-[1050px] border-separate border-spacing-0 text-left text-sm">
              <thead className="bg-[#1b5e20] text-xs font-bold uppercase tracking-[.06em] text-white dark:bg-[#1b5e20] dark:text-white">
                <tr>
                  <th scope="col" className="px-5 py-4 text-left align-middle">Trường học</th>
                  <th scope="col" className="p-4 text-center align-middle">Khu vực</th>
                  <th scope="col" className="p-4 text-center align-middle">Phân hiệu</th>
                  <th scope="col" className="p-4 text-center align-middle">Trạng thái</th>
                  <th scope="col" className="p-4 text-center align-middle">Thời hạn bảo vệ</th>
                  <th scope="col" className="px-5 py-4 text-center align-middle">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleSchools.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-border/70 transition-colors even:bg-muted/20 hover:bg-[#edf7ee] dark:hover:bg-[#21432b]"
                  >
                    <td className="p-4">
                      <button
                        className="text-left font-semibold text-foreground hover:text-primary focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary"
                        onClick={() => setSelected(s.id)}
                      >
                        {s.display_name}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.school_code}
                      </p>
                      {s.contract_status && (
                        <p className="mt-1 text-xs text-primary">
                          {labels[s.contract_status] ?? s.contract_status}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-center align-middle text-muted-foreground">
                      {s.ward}
                      <br />
                      {s.province}
                    </td>
                    <td className="p-4 text-center align-middle">{s.branches}</td>
                    <td className="p-4 text-center align-middle">
                      <Badge variant="outline" className={
                        s.is_deleted
                          ? 'border-slate-300 bg-slate-100 text-slate-600'
                          : s.visible_status === 'AVAILABLE'
                          ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          : s.visible_status === 'CONTRACTED'
                            ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
                            : 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200'
                      }>
                        {s.is_deleted ? 'Đã ngừng sử dụng' : (labels[s.visible_status] ?? s.visible_status)}
                      </Badge>
                    </td>
                    <td className="p-4 text-center align-middle">
                      <span className="whitespace-nowrap tabular-nums text-sm text-foreground"
                        aria-label={s.protected_from && s.protected_until ? `Từ ${channelDate(s.protected_from)} đến ${channelDate(s.protected_until)}` : 'Chưa có thời hạn bảo vệ'}>
                        {s.protected_from && s.protected_until
                          ? `${channelDate(s.protected_from)} – ${channelDate(s.protected_until)}`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center align-middle">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <AppButton tone="outline" size="icon-sm"
                          className="h-9 w-9 min-w-9 rounded-lg border border-[#1b5e20] bg-white p-0 text-[#1b5e20] shadow-sm hover:bg-[#1b5e20] hover:text-white dark:border-[#81c784] dark:bg-[#17341f] dark:text-[#a5d6a7] dark:hover:bg-[#1b5e20] dark:hover:text-white"
                          aria-label={`Xem chi tiết ${s.display_name}`}
                          title="Xem chi tiết" onClick={() => setSelected(s.id)}>
                          <Eye className="size-4" aria-hidden="true"/>
                        </AppButton>
                        {canAdminManage && !s.is_deleted && <AppButton tone="outline" size="icon-sm"
                          className="h-9 w-9 min-w-9 rounded-lg"
                          disabled={adminBusy}
                          aria-label={`Sửa ${s.display_name}`}
                          title="Sửa trường"
                          onClick={() => void startEditSchool(s)}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </AppButton>}
                        {canAdminManage && <AppButton tone="outline" size="icon-sm"
                          className="h-9 w-9 min-w-9 rounded-lg"
                          aria-label={s.is_deleted ? `Khôi phục ${s.display_name}` : `Xóa ${s.display_name}`}
                          title={s.is_deleted ? 'Khôi phục trường' : 'Xóa trường'}
                          onClick={() => { setArchiveTarget(s); setAdminError(''); }}>
                          {s.is_deleted ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
                        </AppButton>}
                        {!adminMode && s.can_register && (
                          <Button
                            type="button"
                            size={registrationIconOnly ? 'icon' : 'sm'}
                            className={registrationIconOnly ? 'h-9 w-9 rounded-lg border border-primary bg-card text-primary shadow-sm hover:bg-primary hover:text-primary-foreground' : undefined}
                            title={registrationIconOnly ? 'Đăng ký tiếp cận' : undefined}
                            aria-label={registrationIconOnly ? `Đăng ký tiếp cận ${s.display_name}` : undefined}
                            disabled={mutation.isPending}
                            onClick={() => { mutation.reset(); setRegisterSchool(s); }}
                          >
                            {registrationIconOnly ? <UserRoundPlus className="size-4" aria-hidden="true"/> : 'Đăng ký tiếp cận'}
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
          <AppEmptyState icon={Building2}
            title={search || (salesDirectory ? provinceFilter || wardFilter : statusFilter !== 'ALL') ? 'Không có trường phù hợp với bộ lọc' : salesDirectory ? 'Không còn trường khả dụng' : 'Chưa có danh bạ trường học'}
            description={search || (salesDirectory ? provinceFilter || wardFilter : statusFilter !== 'ALL') ? 'Thử đổi từ khóa hoặc khu vực để tìm lại.' : salesDirectory ? 'Các trường đang được tiếp cận hoặc đã ký hợp đồng sẽ không xuất hiện tại đây.' : 'Hãy thêm trường hoặc nhập danh sách Excel để bắt đầu.'}/>
        )}
        <AppPagination page={page} pageSize={schools.data?.page_size ?? 20} total={schools.data?.total ?? 0} showSummary={false}
          disabled={schools.isFetching} onPageChange={setPage}
          pageSizeOptions={SCHOOL_ROWS_PER_PAGE} onPageSizeChange={value => {setPageSize(value);setPage(1);}}/>
      </section>
      <ConfirmDialog
        open={registerSchool !== null}
        onOpenChange={(open) => { if (!open && !mutation.isPending) { setRegisterSchool(null); mutation.reset(); } }}
        title="Xác nhận đăng ký tiếp cận"
        description={<>Bạn có chắc chắn muốn đăng ký tiếp cận <strong>{registerSchool?.display_name}</strong> không? Quyền bảo vệ ban đầu là 5 ngày và sẽ chiếm một suất trong hạn mức hiện hành.</>}
        confirmLabel="Xác nhận tiếp cận"
        busy={mutation.isPending}
        onConfirm={() => {
          if (!registerSchool || mutation.isPending) return;
          void run({
            path: '/approach-registrations',
            body: { idempotency_key: key(), customer_id: registerSchool.customer_id, source: 'SCHOOL_DIRECTORY' },
          }).then(() => {
            setRegisterSchool(null);
            appNotice.success('Đăng ký tiếp cận thành công.', 'Danh sách trường và hạn mức đã được cập nhật.');
          }).catch(() => undefined);
        }}
      >
        {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
        <p className="text-xs text-muted-foreground">Hệ thống kiểm tra lại quyền đăng ký, trạng thái trường và hạn mức khi xác nhận. Nếu trường đã được người khác nhận, đăng ký sẽ bị từ chối.</p>
      </ConfirmDialog>
      <AppDialog open={importOpen} onOpenChange={(open) => {if (!upload.isPending) setImportOpen(open);}} busy={upload.isPending} title="Nhập danh bạ trường học" description="File .xlsx tối đa 2 MB, sheet DANH_SACH_TRUONG, đúng 12 cột của mẫu. Xem trước không thay đổi dữ liệu.">
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
          {!adminMode && upload.error && <ErrorText>{upload.error.message}</ErrorText>}
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
        </AppDialog>
      <AppDrawer open={selected !== null} onOpenChange={(open) => {if (!open) setSelected(null);}} title={detail.data?.display_name ?? 'Hồ sơ trường học'} description={detail.data?.school_code ?? ''} wide>
          {detail.error && <ErrorText>{detail.error.message}</ErrorText>}
          {detail.isPending ? (
            <p>Đang tải hồ sơ…</p>
          ) : (
            detail.data && (
              <SchoolDetail data={detail.data} />
            )
          )}
          {mutation.error && <ErrorText>{mutation.error.message}</ErrorText>}
        </AppDrawer>
      <AppDialog open={editUnitChoices.length > 0}
        onOpenChange={open => { if (!open && !adminBusy) setEditUnitChoices([]); }}
        busy={adminBusy} title="Chọn trường chính hoặc phân hiệu để sửa">
        <div className="space-y-2">
          {editUnitChoices.map(unit => <AppButton key={unit.id} tone="outline"
            className="w-full justify-start" onClick={() => {
              setEditUnitChoices([]);
              openEditor(unit);
            }}>
            <Pencil className="mr-2 size-4"/>
            {unit.name} ({unit.unit_type === 'MAIN' ? 'Trường chính' : 'Phân hiệu'})
          </AppButton>)}
        </div>
      </AppDialog>
      <AppDialog open={editingUnit !== null}
        onOpenChange={open => { if (!open && !adminBusy) { setEditingUnit(null); setAdminError(''); } }}
        busy={adminBusy} title="Sửa thông tin trường/phân hiệu">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Mã trường chính được giữ nguyên để bảo vệ quan hệ dữ liệu.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['name','Tên đơn vị'],['province','Tỉnh/thành'],['ward','Phường/xã'],['address','Địa chỉ'],
              ['contact_name','Người liên hệ'],['contact_position','Chức vụ'],['contact_phone','SĐT liên hệ'],
              ['school_phone','SĐT trường'],['email','Email']
            ] as const).map(([key,label]) => <label key={key} className="text-sm">{label}
              <Input className="mt-1" value={editForm[key] ?? ''}
                onChange={event => setEditForm(current => ({...current,[key]:event.target.value}))}/>
            </label>)}
          </div>
          <label className="block text-sm">Ghi chú <span className="text-muted-foreground">(không bắt buộc)</span>
            <Textarea className="mt-1" rows={3} maxLength={4000}
              placeholder="Nhập ghi chú về trường học hoặc phân hiệu..."
              value={editForm.note ?? ''}
              onChange={event => setEditForm(current => ({...current,note:event.target.value}))}/>
          </label>
          {adminError && <p role="alert" className="text-sm text-red-600">{adminError}</p>}
          <div className="flex justify-end gap-2">
            <AppButton tone="outline" disabled={adminBusy} onClick={() => setEditingUnit(null)}>Hủy</AppButton>
            <AppButton disabled={adminBusy} onClick={() => void saveEditor()}>Lưu thay đổi</AppButton>
          </div>
        </div>
      </AppDialog>
      <AppDialog open={archiveTarget !== null}
        onOpenChange={open => { if (!open && !adminBusy) { setArchiveTarget(null); setAdminError(''); } }}
        busy={adminBusy} title={archiveTarget?.is_deleted ? 'Khôi phục trường học' : 'Xác nhận xóa trường học'}>
        <div className="space-y-3">
          <p className="text-sm">Bạn có chắc chắn muốn {archiveTarget?.is_deleted ? 'khôi phục' : 'xóa'} trường <strong>{archiveTarget?.display_name}</strong> không?</p>
          <div className="flex justify-end gap-2">
            <AppButton tone="outline" disabled={adminBusy} onClick={() => setArchiveTarget(null)}>Hủy</AppButton>
            <AppButton disabled={adminBusy} onClick={() => void changeArchive()}>Xác nhận</AppButton>
          </div>
        </div>
      </AppDialog>
      <AppDialog open={!!capacity} onOpenChange={(open) => {if (!open) setCapacity(null);}} title={`Hạn mức trường của ${capacity?.name ?? ''}`} description="Giảm hạn mức không thu hồi quyền bảo vệ hiện tại. CTV chỉ nhận thêm khi còn suất.">
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
        </AppDialog>
    </div>
  );
}

/** Read-only profile used by the school directory. */
function SchoolDetail({ data }: { data: Detail }) {
  return <SchoolProfileDetails units={data.units} />;
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
