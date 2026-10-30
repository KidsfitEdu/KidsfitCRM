'use client';

import { useEffect, useMemo, useState } from 'react';
import { Settings2, RefreshCw } from 'lucide-react';
import { AdminListPanel, AdminListToolbar, AdminIconAction, adminTableClass, adminTableHeadClass } from '@/components/crm/admin/admin-list-ui';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppPagination } from '@/components/common/app-pagination';
import { AppButton } from '@/components/common/app-button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchCapacityRows, saveCapacityLimit, type Capacity } from '@/src/services/capacity.service';
import { appNotice } from '@/components/common/app-toast-provider';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormActions } from '@/components/common/form-actions';
import { FormError } from '@/components/common/form-error';

type Props={apiBase:string;token:string;abilities:string[]};
export function CapacitiesPage({apiBase,token,abilities}:Props) {
  const [rows,setRows]=useState<Capacity[]>([]);
  const [search,setSearch]=useState('');
  const [searchDraft,setSearchDraft]=useState('');
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [organization,setOrganization]=useState('ALL');
  const [selected,setSelected]=useState<Capacity|null>(null);
  const [limitInput,setLimitInput]=useState('10');
  const [fieldErrors,setFieldErrors]=useState<{limit?:string;reason?:string}>({});
  const limit=Number(limitInput);
  const [reason,setReason]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [confirmOpen,setConfirmOpen]=useState(false);
  const canManage=abilities.includes('channel_sales.school.capacity.manage')||abilities.includes('*');
  const reload=async()=>{
    if(!apiBase)return;
    setLoading(true);setError('');
    try {const result=await fetchCapacityRows(apiBase,token);setRows(result.data);}
    catch(e){setError(e instanceof Error?e.message:'Không tải được hạn mức.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void reload();},[apiBase,token]);
  const orgs=useMemo(()=>Array.from(new Set(rows.map(x=>x.organization_name))).sort(),[rows]);
  const filtered=rows.filter(x=>(organization==='ALL'||x.organization_name===organization)&&[x.name,x.organization_name].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  const validate=()=>{
    const errors: {limit?:string;reason?:string} = {};
    if(!/^(0|[1-9]\d*)$/.test(limitInput) || !Number.isSafeInteger(limit) || limit>1000) errors.limit='Nhập số nguyên từ 0 đến 1.000, không có số 0 ở đầu.';
    if(reason.trim().length<3) errors.reason='Lý do phải có ít nhất 3 ký tự.';
    else if(reason.trim().length>2000) errors.reason='Lý do không được vượt quá 2.000 ký tự.';
    setFieldErrors(errors);
    return Object.keys(errors).length===0;
  };
  const save=async()=>{
    if(!selected||!canManage)return;
    if(!validate()){setConfirmOpen(false);return;}
    setLoading(true);setError('');
    try{
      await saveCapacityLimit(apiBase,token,selected.id,limit,reason.trim());
      setSelected(null);setConfirmOpen(false);setReason('');appNotice.success('Cập nhật hạn mức thành công','Đã lưu lịch sử thay đổi.');await reload();
    }catch(e){const message=e instanceof Error?e.message:'Không cập nhật được hạn mức.';setError(message);setConfirmOpen(false);}
    finally{setLoading(false);}
  };
  return <div className="space-y-4">
    <AppPageHeader eyebrow="QUẢN TRỊ / HẠN MỨC TIẾP CẬN" title="Quản lý hạn mức tiếp cận"
      description="Theo dõi hạn mức trường đang tiếp cận của Nhân viên/CTV. Giảm hạn mức không thu hồi quyền hợp lệ hiện có."
      actions={<AppButton tone="blue" premium leadingIcon={<RefreshCw className="size-4"/>}
        disabled={loading||!apiBase} onClick={()=>void reload()}>Làm mới</AppButton>}/>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <AdminListPanel>
      <AdminListToolbar search={searchDraft} onSearchChange={setSearchDraft}
        onSearch={()=>{setSearch(searchDraft.trim());setPage(1);}}
        onReset={()=>{setSearchDraft('');setSearch('');setOrganization('ALL');setPage(1);}}
        placeholder="Tìm tên nhân viên hoặc CTV..." searchLabel="Tìm nhân sự hạn mức"
        filters={<AppNativeSelect aria-label="Lọc tổ chức" containerClassName="h-11 w-full sm:w-[200px]" value={organization}
          onChange={e=>{setOrganization(e.target.value);setPage(1);}}>
          <option value="ALL">Tất cả tổ chức</option>{orgs.map(o=><option key={o} value={o}>{o}</option>)}
        </AppNativeSelect>}/>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}><tr>
            <th className="px-5 py-4">Nhân sự</th><th className="px-5 py-4">Tổ chức</th>
            <th className="px-5 py-4 text-center">Đang tiếp cận</th><th className="px-5 py-4 text-center">Hạn mức</th>
            <th className="px-5 py-4 text-center">Thao tác</th>
          </tr></thead>
          <tbody>{filtered.slice((page-1)*pageSize,page*pageSize).map(x=><tr key={x.id} className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
            <td className="px-5 py-4 font-semibold">{x.name}</td><td className="px-5 py-4">{x.organization_name}</td>
            <td className="px-5 py-4 text-center tabular-nums">{x.active}</td>
            <td className="px-5 py-4 text-center tabular-nums">{x.school_approach_limit}</td>
            <td className="px-5 py-4 text-center">{canManage&&<AdminIconAction icon={Settings2} tone="blue"
              label={`Điều chỉnh hạn mức ${x.name}`} onClick={()=>{setSelected(x);setLimitInput(String(x.school_approach_limit));setReason('');setFieldErrors({});setError('');}}/>}</td>
          </tr>)}</tbody>
        </table>
        {!loading&&filtered.length===0&&<p className="p-8 text-center text-sm text-muted-foreground">{apiBase?'Không có nhân sự phù hợp.':'Chưa kết nối API.'}</p>}
      </div>
      <AppPagination page={page} pageSize={pageSize} total={filtered.length} itemLabel="nhân sự" showSummary={false}
        pageSizeOptions={[10,20,50]} onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
    </AdminListPanel>
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open&&!loading)setSelected(null);}}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Điều chỉnh hạn mức</DialogTitle><DialogDescription>{selected?.name} · {selected?.organization_name}. Giảm hạn mức không thu hồi quyền hiện tại.</DialogDescription></DialogHeader><label className="text-sm font-medium">Số trường tối đa<Input className="mt-1" type="text" inputMode="numeric" aria-invalid={!!fieldErrors.limit} aria-describedby={fieldErrors.limit?'capacity-limit-error':undefined} value={limitInput} onChange={e=>{setLimitInput(e.target.value);setFieldErrors(x=>({...x,limit:undefined}));}}/><FormError id="capacity-limit-error">{fieldErrors.limit}</FormError></label><label className="text-sm font-medium">Lý do thay đổi<Input className="mt-1" value={reason} aria-invalid={!!fieldErrors.reason} aria-describedby={fieldErrors.reason?'capacity-reason-error':undefined} onChange={e=>{setReason(e.target.value);setFieldErrors(x=>({...x,reason:undefined}));}}/><FormError id="capacity-reason-error">{fieldErrors.reason}</FormError></label><div className="space-y-2"><h4 className="text-sm font-semibold">Lịch sử gần đây</h4>{selected?.history.map((h,i)=><p className="border-t py-2 text-xs text-muted-foreground" key={i}>{h.previous_limit} → {h.new_limit} · {new Date(h.created_at).toLocaleString('vi-VN')} · {h.reason}</p>)}{selected?.history.length===0&&<p className="text-xs text-muted-foreground">Chưa có thay đổi.</p>}</div><FormActions busy={loading} onCancel={()=>setSelected(null)} onSave={()=>{if(validate())setConfirmOpen(true);}} saveLabel="Lưu hạn mức"/></DialogContent></Dialog>
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Xác nhận điều chỉnh hạn mức" description={`Thay đổi hạn mức ${selected?.name ?? ''} từ ${selected?.school_approach_limit ?? '—'} thành ${limit} trường. ${selected && limit < selected.active ? 'Hạn mức mới thấp hơn số trường đang tiếp cận. ' : ''}Quyền đang hợp lệ không bị thu hồi. Lý do: ${reason || 'Chưa nhập'}`} busy={loading} confirmLabel="Xác nhận lưu" onConfirm={()=>void save()} />
  </div>;
}
