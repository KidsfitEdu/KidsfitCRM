'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AdminListPanel, AdminStatusBadge, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
import { AppPagination } from '@/components/common/app-pagination';
import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';
import type { RolePageProps } from '@/types/role-pages';

export function BoardPoliciesPage({apiBase,token,abilities}:RolePageProps) {
  const [page,setPage]=useState(1);
  const [organization,setOrganization]=useState('ALL');
  const allowed=abilities.includes('*')||abilities.includes('channel_sales.school.escalation.resolve')||abilities.includes('channel_sales.school.dispute.resolve');
  const connected=Boolean(apiBase&&token&&allowed);
  const query=useQuery({
    queryKey:['board','policies',apiBase,page],
    queryFn:()=>channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page='+page),
    enabled:connected,
  });
  const data=query.data;
  const policies=(data?.policies??[]).filter(p=>organization==='ALL'||String(p.organization_id)===organization)
    .sort((a,b)=>a.organization_id-b.organization_id||b.version-a.version);
  const orgName=(id:number)=>data?.organizations.find(x=>x.id===id)?.name??String(id);
  const active=policies.filter(p=>p.status==='ACTIVE');
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Chính sách vận hành"
      description="Theo dõi chính sách đang có hiệu lực và lịch sử phiên bản. Quyền kích hoạt hoặc sửa chính sách không được mặc định cấp cho BGĐ."
      actions={<AppButton tone="outline" disabled={!connected||query.isFetching} leadingIcon={<RefreshCw className="size-4"/>} onClick={()=>void query.refetch()}>Làm mới</AppButton>}/>
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
      <div className="border-b p-5">
        <label htmlFor="board-policy-org" className="mb-2 block text-sm font-medium">Tổ chức</label>
        <AppNativeSelect id="board-policy-org" containerClassName="w-full sm:w-72" value={organization} onChange={e=>{setOrganization(e.target.value);setPage(1);}}>
          <option value="ALL">Tất cả tổ chức</option>
          {(data?.organizations??[]).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </AppNativeSelect>
      </div>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr><th className="px-5 py-4">Tổ chức</th><th className="px-5 py-4">Phiên bản</th><th className="px-5 py-4">Thời hạn xử lý</th><th className="px-5 py-4">Gia hạn</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4">Căn cứ quyết định</th></tr></thead>
          <tbody>{policies.map(p=><tr className="border-b" key={p.id}>
            <td className="px-5 py-4 font-medium">{orgName(p.organization_id)}</td>
            <td className="px-5 py-4">{p.version}</td>
            <td className="px-5 py-4">Quản lý {p.manager_review_hours}h · Admin {p.admin_review_hours}h · Phân bổ {p.invitation_hours}h</td>
            <td className="px-5 py-4">{p.max_extension_days} ngày/lần · {p.max_extension_count} lần</td>
            <td className="px-5 py-4"><AdminStatusBadge status={p.status} label={p.status==='ACTIVE'?'Đang áp dụng':p.status==='DRAFT'?'Bản nháp':'Đã thay phiên bản'}/></td>
            <td className="break-words px-5 py-4">{p.decision_reference||'Chưa cập nhật'}</td>
          </tr>)}</tbody>
        </table>
        {connected&&!query.isFetching&&!policies.length&&<p className="p-7 text-center text-sm text-muted-foreground">Không có phiên bản chính sách phù hợp trong trang này.</p>}
      </div>
      <AppPagination page={page} pageSize={data?.pagination?.page_size??100} total={data?.pagination?.totals.policies??policies.length}
        disabled={query.isFetching} onPageChange={setPage} showSummary={false}/>
    </AdminListPanel>
    <p className="text-xs text-muted-foreground">Các giới hạn hiển thị được lấy từ phiên bản chính sách trong API; không áp dụng con số mặc định chưa kích hoạt. Danh sách được lọc trên trang dữ liệu hiện tại.</p>
  </div>;
}
