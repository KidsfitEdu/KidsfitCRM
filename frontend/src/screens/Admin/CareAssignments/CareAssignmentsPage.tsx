'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Headset, Eye, UserRoundCheck } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AdminListPanel, AdminListToolbar, AdminIconAction, adminTableClass, adminTableHeadClass, adminTableCellClass } from '@/components/common/admin-list-ui';
import { AppPagination } from '@/components/common/app-pagination';
import { channelRequest } from '@/lib/channel-operations';
import type { AdminPageProps } from '@/screens/Admin/types';

type Assignment = {id:number;contract_code:string;school_name:string;partner:string;
  care_user_id:number|null;care_name:string|null;open_tickets:number};
type Staff = {id:number;name:string;organization_id:number;schools:number;open_tickets:number};
type Result = {data:Assignment[];users:Staff[];total:number;page:number;page_size:number};

export function CareAssignmentsPage({apiBase,token,abilities,onChanged}:AdminPageProps) {
  const [draft,setDraft]=useState('');
  const [search,setSearch]=useState('');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [selected,setSelected]=useState<Assignment|null>(null);
  const [staffId,setStaffId]=useState('');
  const [reason,setReason]=useState('');
  const [confirm,setConfirm]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const queryClient=useQueryClient();
  const allowed=!apiBase || abilities.includes('*') || (abilities.includes('channel_sales.school.care.assign')
    && abilities.includes('channel_sales.scope.all') && abilities.includes('channel_sales.identity.manage'));
  const query=useQuery({
    queryKey:['admin-care-assignments',apiBase,token,page,pageSize,search],
    queryFn:()=>channelRequest<Result>(apiBase,token,'/care/assignments?page='+page+'&page_size='+pageSize
      +'&search='+encodeURIComponent(search)),
    enabled:!!apiBase&&!!token&&allowed,
  });
  const staff=query.data?.users??[];
  const close=()=>{setSelected(null);setStaffId('');setReason('');setError('');};
  const assign=async()=>{
    if(!selected||!staffId||!reason.trim())return;
    setBusy(true);setError('');
    try{
      const assignee=staff.find(s=>s.id===Number(staffId));
      if(!assignee)throw Error('Nhân sự CSKH không hợp lệ.');
      await channelRequest(apiBase,token,'/contracts/'+selected.id+'/care-handover',{
        method:'POST',body:JSON.stringify({
          idempotency_key:crypto.randomUUID(),user_id:assignee.id,
          care_organization_id:assignee.organization_id,reason:reason.trim(),
        }),
      });
      setConfirm(false);close();
      await Promise.all([queryClient.invalidateQueries({queryKey:['admin-care-assignments']}),onChanged()]);
    }catch(cause){setConfirm(false);setError(cause instanceof Error?cause.message:'Không thể phân công CSKH.');}
    finally{setBusy(false);}
  };
  return <div className="space-y-5">
    <AppPageHeader eyebrow="QUẢN TRỊ / KIDSFIT CRM" title="Phân công CSKH"
      description="Admin điều phối tập trung các trường đã xác minh, kể cả trường do đối tác bán hàng phụ trách."/>
    {!allowed&&<p role="alert" className="rounded-xl border p-4 text-sm text-destructive">Tài khoản chưa có quyền phân công CSKH.</p>}
    {!apiBase&&<p className="rounded-xl border p-4 text-sm text-muted-foreground">Chế độ xem thử chỉ đọc. Kết nối Backend để phân công thực tế.</p>}
    {query.error&&<p role="alert" className="rounded-xl border p-4 text-sm text-destructive">{query.error.message}</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {staff.map(s=><div key={s.id} className="rounded-2xl border bg-card p-4">
        <div className="flex items-center gap-2 font-semibold"><Headset className="size-4 text-[#1b5e20]"/>{s.name}</div>
        <p className="mt-2 text-sm text-muted-foreground">{s.schools} trường · {s.open_tickets} ticket chưa hoàn tất</p>
      </div>)}
    </div>
    <AdminListPanel>
      <AdminListToolbar search={draft} onSearchChange={setDraft}
        onSearch={()=>{setSearch(draft.trim());setPage(1);}}
        onReset={()=>{setDraft('');setSearch('');setPage(1);}}
        searchLabel="Tìm trường hoặc mã hợp đồng" placeholder="Tên trường, mã hợp đồng..."/>
      <div className="overflow-x-auto"><table className={adminTableClass}>
        <thead className={adminTableHeadClass}><tr>
          <th className={adminTableCellClass}>Trường</th><th className={adminTableCellClass}>Đối tác / Sales</th>
          <th className={adminTableCellClass}>CSKH phụ trách</th><th className={adminTableCellClass}>Ticket đang mở</th>
          <th className={adminTableCellClass}>Thao tác</th>
        </tr></thead>
        <tbody>{query.data?.data.map(x=><tr key={x.id} className="border-b even:bg-muted/20">
          <td className={adminTableCellClass}><p className="font-semibold">{x.school_name}</p><p className="text-xs text-muted-foreground">{x.contract_code}</p></td>
          <td className={adminTableCellClass}>{x.partner}</td>
          <td className={adminTableCellClass}>{x.care_name??'Chưa phân công'}</td>
          <td className={adminTableCellClass}>{x.open_tickets}</td>
          <td className={adminTableCellClass}><AdminIconAction icon={x.care_user_id?Eye:UserRoundCheck}
            label={x.care_user_id?'Điều chuyển CSKH':'Phân công CSKH'} disabled={!apiBase||!allowed}
            onClick={()=>{setSelected(x);setStaffId(x.care_user_id?String(x.care_user_id):'');setReason('');setError('');}}/></td>
        </tr>)}</tbody>
      </table></div>
      {query.isLoading&&<p className="p-6 text-sm text-muted-foreground">Đang tải trường đủ điều kiện…</p>}
      {query.data?.data.length===0&&<p className="p-6 text-sm text-muted-foreground">Không có hợp đồng phù hợp.</p>}
      <AppPagination page={page} pageSize={pageSize} total={query.data?.total??0}
        disabled={query.isFetching||!apiBase} showSummary={false} pageSizeOptions={[10,20,50,100]}
        onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n);setPage(1);}}/>
    </AdminListPanel>
    <AppDialog open={!!selected} onOpenChange={open=>{if(!open&&!busy)close();}}
      title={selected?.care_user_id?'Điều chuyển CSKH':'Phân công CSKH'}
      description={selected?.school_name} busy={busy}
      footer={<><AppButton tone="neutral" onClick={close} disabled={busy}>Hủy</AppButton>
        <AppButton disabled={!staffId||!reason.trim()||busy} onClick={()=>setConfirm(true)}>Tiếp tục</AppButton></>}>
      <div className="space-y-4">
        <label className="block text-sm font-semibold" htmlFor="assigned-care-user">Nhân viên CSKH</label>
        <select id="assigned-care-user" className="w-full rounded-xl border bg-background p-3" value={staffId}
          onChange={e=>setStaffId(e.target.value)}>
          <option value="">Chọn người phụ trách</option>
          {staff.map(s=><option key={s.id} value={s.id}>{s.name} · {s.schools} trường / {s.open_tickets} ticket mở</option>)}
        </select>
        <label className="block text-sm font-semibold" htmlFor="assignment-reason">Lý do phân công / điều chuyển</label>
        <textarea id="assignment-reason" className="w-full rounded-xl border bg-background p-3" rows={3}
          maxLength={4000} value={reason} onChange={e=>setReason(e.target.value)}/>
        <p className="text-xs text-muted-foreground">Hệ thống giữ lịch sử và chuyển các ticket chưa đóng. Không thay đổi quyền sở hữu Sales hay hoa hồng.</p>
        {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </AppDialog>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} busy={busy}
      title="Xác nhận phân công CSKH"
      description={'Bạn sắp phân công '+(selected?.school_name??'trường')+' cho '+(staff.find(s=>String(s.id)===staffId)?.name??'nhân viên')+'. Các ticket chưa đóng sẽ chuyển theo người phụ trách.'}
      onConfirm={()=>void assign()} confirmLabel="Xác nhận"/>
  </div>;
}
