'use client';

import { useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AdminListPanel, AdminListToolbar, AdminIconAction, AdminStatusBadge, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

export function BoardPoliciesPage({apiBase,token,abilities}:RolePageProps) {
  const [organization,setOrganization]=useState('ALL');
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [detailId,setDetailId]=useState<number|null>(null);
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.escalation.resolve')||abilities.includes('channel_sales.school.dispute.resolve');
  const connected=Boolean(apiBase&&token&&allowed);
  const query=useQuery({
    queryKey:['board','policies',apiBase],
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page=1'),
    enabled:connected,
  });
  const data=query.data;
  const policies=(data?.policies??[]).filter(p=>(organization==='ALL'||String(p.organization_id)===organization)
      && [data?.organizations.find(o=>o.id===p.organization_id)?.name??'',String(p.version),p.decision_reference??'']
        .some(value=>value.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))))
    .sort((a,b)=>a.organization_id-b.organization_id||b.version-a.version);
  const orgName=(id:number)=>data?.organizations.find(x=>x.id===id)?.name??String(id);
  const active=(data?.policies??[]).filter(p=>p.status==='ACTIVE');
  const detail=(data?.policies??[]).find(p=>p.id===detailId);
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Chính sách vận hành"
      description="Theo dõi phiên bản chính sách và thời hạn áp dụng."
      actions={<AdminIconAction icon={RefreshCw} label="Làm mới danh sách chính sách"
        disabled={!connected||query.isFetching} onClick={()=>void query.refetch()}/>}/>
    {!connected&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Chưa kết nối API hoặc chưa đủ quyền xem chính sách.</p>}
    {query.error&&<p className="rounded-xl border border-red-300 p-4 text-sm text-red-600" role="alert">{query.error instanceof Error?query.error.message:'Không tải được chính sách.'}</p>}
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">Chính sách đang áp dụng</h3>
      {active.length===0&&<p className="mt-2 text-sm text-muted-foreground">Chưa có chính sách đang áp dụng trong trang dữ liệu này.</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {active.map(p=><section key={p.id} className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">{orgName(p.organization_id)} · Phiên bản {p.version}</h4><AdminStatusBadge status={p.status} label="Đang áp dụng"/></div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Duyệt của Quản lý</p><p className="font-medium">{p.manager_review_hours} giờ</p></div>
            <div><p className="text-xs text-muted-foreground">Duyệt của Admin</p><p className="font-medium">{p.admin_review_hours} giờ</p></div>
            <div><p className="text-xs text-muted-foreground">Thời hạn phân bổ</p><p className="font-medium">{p.invitation_hours} giờ</p></div>
            <div><p className="text-xs text-muted-foreground">Gia hạn tiếp cận</p><p className="font-medium">Tối đa {p.max_extension_count} lần, {p.max_extension_days} ngày/lần</p></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Tổng thời gian cộng thêm tối đa: {p.max_total_extension_days} ngày</p>
        </section>)}
      </div>
    </div>
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>setSearch(draft.trim())}
        onReset={()=>{setDraft('');setSearch('');setOrganization('ALL');}}
        searchLabel="Tìm chính sách" placeholder="Tên tổ chức, phiên bản, căn cứ..."
        filters={<AppNativeSelect aria-label="Lọc tổ chức" containerClassName="w-full sm:w-56"
          value={organization} onChange={e=>setOrganization(e.target.value)}>
          <option value="ALL">Tất cả tổ chức</option>
          {(data?.organizations??[]).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </AppNativeSelect>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Tổ chức</th><th className="px-5 py-4">Phiên bản</th><th className="px-5 py-4">Thời hạn xử lý</th><th className="px-5 py-4">Gia hạn</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4">Căn cứ quyết định</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
          <tbody>{policies.map(p=><tr className="border-b" key={p.id}>
            <td className="px-5 py-4 font-medium">{orgName(p.organization_id)}</td>
            <td className="px-5 py-4">{p.version}</td>
            <td className="px-5 py-4">Quản lý {p.manager_review_hours}h · Admin {p.admin_review_hours}h · Phân bổ {p.invitation_hours}h</td>
            <td className="px-5 py-4">{p.max_extension_days} ngày/lần · {p.max_extension_count} lần</td>
            <td className="px-5 py-4"><AdminStatusBadge status={p.status} label={p.status==='ACTIVE'?'Đang áp dụng':p.status==='DRAFT'?'Bản nháp':'Đã thay phiên bản'}/></td>
            <td className="break-words px-5 py-4">{p.decision_reference||'Chưa cập nhật'}</td>
            <td className="px-5 py-4 text-right"><AdminIconAction icon={Eye} label="Xem chi tiết chính sách"
              onClick={()=>setDetailId(p.id)}/></td>
          </tr>)}</tbody>
        </table>
        {connected&&!query.isFetching&&!policies.length&&<p className="p-7 text-center text-sm text-muted-foreground">Không có phiên bản chính sách phù hợp trong trang này.</p>}
      </div>
    </AdminListPanel>
    <p className="text-xs text-muted-foreground">Tìm kiếm hiện áp dụng trên tối đa 100 phiên bản chính sách API trả về, không phải toàn bộ lịch sử. Các giới hạn được lấy từ phiên bản lưu trên máy chủ.</p>
    <AppDrawer open={detailId!==null} onOpenChange={open=>{if(!open)setDetailId(null);}} title="Chi tiết chính sách">
      {detail&&<div className="space-y-4 text-sm">
        <h3 className="text-lg font-semibold">{orgName(detail.organization_id)} · Phiên bản {detail.version}</h3>
        <AdminStatusBadge status={detail.status} label={detail.status==='ACTIVE'?'Đang áp dụng':detail.status==='DRAFT'?'Bản nháp':'Đã thay phiên bản'}/>
        <dl className="grid grid-cols-2 gap-4 rounded-xl border p-4">
          <div><dt className="text-muted-foreground">Quản lý phản hồi</dt><dd className="font-semibold">{detail.manager_review_hours} giờ</dd></div>
          <div><dt className="text-muted-foreground">Admin phản hồi</dt><dd className="font-semibold">{detail.admin_review_hours} giờ</dd></div>
          <div><dt className="text-muted-foreground">Phân bổ</dt><dd className="font-semibold">{detail.invitation_hours} giờ</dd></div>
          <div><dt className="text-muted-foreground">Gia hạn mỗi lần</dt><dd className="font-semibold">{detail.max_extension_days} ngày</dd></div>
          <div><dt className="text-muted-foreground">Số lần gia hạn</dt><dd className="font-semibold">{detail.max_extension_count} lần</dd></div>
          <div><dt className="text-muted-foreground">Tổng ngày gia hạn</dt><dd className="font-semibold">{detail.max_total_extension_days} ngày</dd></div>
        </dl>
        <section className="rounded-xl border p-4"><h4 className="font-semibold">Căn cứ quyết định</h4>
          <p className="mt-2 whitespace-pre-wrap">{detail.decision_reference||'Chưa cập nhật'}</p>
        </section>
      </div>}
    </AppDrawer>
  </div>;
}
