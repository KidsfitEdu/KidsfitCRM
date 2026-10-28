'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { channelRequest } from '@/lib/channel-operations';
import { appNotice } from '@/components/common/app-toast-provider';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormError } from '@/components/common/form-error';

type Capacity = { id:number; name:string; organization_name:string; school_approach_limit:number; active:number; history:{previous_limit:number;new_limit:number;reason:string;created_at:string}[] };
type Props={apiBase:string;token:string;abilities:string[]};
export function AdminCapacityManagement({apiBase,token,abilities}:Props) {
  const [rows,setRows]=useState<Capacity[]>([]);
  const [search,setSearch]=useState('');
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
    try {const result=await channelRequest<{data:Capacity[]}>(apiBase,token,'/school-capacities');setRows(result.data);}
    catch(e){setError(e instanceof Error?e.message:'Không tải được hạn mức.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void reload();},[apiBase,token]);
  const orgs=useMemo(()=>Array.from(new Set(rows.map(x=>x.organization_name))).sort(),[rows]);
  const filtered=rows.filter(x=>(organization==='ALL'||x.organization_name===organization)&&[x.name,x.organization_name].some(v=>v.toLowerCase().includes(search.toLowerCase())));
  const validate=()=>{
    const errors: {limit?:string;reason?:string} = {};
    if(!/^(0|[1-9]\\d*)$/.test(limitInput) || !Number.isSafeInteger(limit) || limit>1000) errors.limit='Nhập số nguyên từ 0 đến 1.000, không có số 0 ở đầu.';
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
      await channelRequest(apiBase,token,'/school-capacities/'+selected.id,{method:'PATCH',body:JSON.stringify({limit,reason:reason.trim()})});
      setSelected(null);setConfirmOpen(false);setReason('');appNotice.success('Cập nhật hạn mức thành công','Đã lưu lịch sử thay đổi.');await reload();
    }catch(e){const message=e instanceof Error?e.message:'Không cập nhật được hạn mức.';setError(message);setConfirmOpen(false);}
    finally{setLoading(false);}
  };
  return <section className="rounded-2xl border bg-card p-5 shadow-sm">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Hạn mức tiếp cận Nhân viên/CTV</h3><p className="mt-1 text-sm text-muted-foreground">Thay đổi hạn mức không thu hồi các quyền tiếp cận hợp lệ hiện có.</p></div><Button variant="outline" disabled={loading||!apiBase} onClick={()=>void reload()}>Làm mới</Button></div>
    {error&&<p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    <div className="mb-4 flex flex-wrap gap-2"><Input className="min-w-52 flex-1" aria-label="Tìm nhân sự hạn mức" placeholder="Tìm tên nhân viên/CTV…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Lọc tổ chức" className="rounded-lg border bg-background px-3" value={organization} onChange={e=>setOrganization(e.target.value)}><option value="ALL">Tất cả tổ chức</option>{orgs.map(o=><option key={o} value={o}>{o}</option>)}</select><Button variant="outline" onClick={()=>{setSearch('');setOrganization('ALL');}}>Reset bộ lọc</Button></div>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="p-3">Nhân sự</th><th className="p-3">Tổ chức</th><th className="p-3">Đang tiếp cận</th><th className="p-3">Hạn mức</th><th className="p-3 text-right">Thao tác</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id} className="border-t hover:bg-muted/30"><td className="p-3 font-medium">{x.name}</td><td className="p-3">{x.organization_name}</td><td className="p-3">{x.active}</td><td className="p-3">{x.school_approach_limit}</td><td className="p-3 text-right">{canManage&&<Button size="sm" variant="outline" onClick={()=>{setSelected(x);setLimitInput(String(x.school_approach_limit));setReason('');setFieldErrors({});setError('');}}>Điều chỉnh</Button>}</td></tr>)}</tbody></table>{!loading&&filtered.length===0&&<p className="p-8 text-center text-sm text-muted-foreground">{apiBase?'Không có nhân sự phù hợp.':'Chưa kết nối API.'}</p>}</div>
    <Dialog open={selected!==null} onOpenChange={open=>{if(!open&&!loading)setSelected(null);}}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Điều chỉnh hạn mức</DialogTitle><DialogDescription>{selected?.name} · {selected?.organization_name}. Giảm hạn mức không thu hồi quyền hiện tại.</DialogDescription></DialogHeader><label className="text-sm font-medium">Số trường tối đa<Input className="mt-1" type="text" inputMode="numeric" aria-invalid={!!fieldErrors.limit} aria-describedby={fieldErrors.limit?'capacity-limit-error':undefined} value={limitInput} onChange={e=>{setLimitInput(e.target.value);setFieldErrors(x=>({...x,limit:undefined}));}}/><FormError id="capacity-limit-error">{fieldErrors.limit}</FormError></label><label className="text-sm font-medium">Lý do thay đổi<Input className="mt-1" value={reason} aria-invalid={!!fieldErrors.reason} aria-describedby={fieldErrors.reason?'capacity-reason-error':undefined} onChange={e=>{setReason(e.target.value);setFieldErrors(x=>({...x,reason:undefined}));}}/><FormError id="capacity-reason-error">{fieldErrors.reason}</FormError></label><div className="space-y-2"><h4 className="text-sm font-semibold">Lịch sử gần đây</h4>{selected?.history.map((h,i)=><p className="border-t py-2 text-xs text-muted-foreground" key={i}>{h.previous_limit} → {h.new_limit} · {new Date(h.created_at).toLocaleString('vi-VN')} · {h.reason}</p>)}{selected?.history.length===0&&<p className="text-xs text-muted-foreground">Chưa có thay đổi.</p>}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>Hủy</Button><Button disabled={loading} onClick={()=>{if(validate())setConfirmOpen(true);}}>Lưu hạn mức</Button></div></DialogContent></Dialog>
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Xác nhận điều chỉnh hạn mức" description={`Thay đổi hạn mức ${selected?.name ?? ''} từ ${selected?.school_approach_limit ?? '—'} thành ${limit} trường. ${selected && limit < selected.active ? 'Hạn mức mới thấp hơn số trường đang tiếp cận. ' : ''}Quyền đang hợp lệ không bị thu hồi. Lý do: ${reason || 'Chưa nhập'}`} busy={loading} confirmLabel="Xác nhận lưu" onConfirm={()=>void save()} />
  </section>;
}
