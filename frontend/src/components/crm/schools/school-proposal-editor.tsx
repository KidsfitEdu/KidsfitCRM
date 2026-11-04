'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { channelRequest } from '@/lib/channel-operations';

type Unit = {
  unit_type: 'MAIN' | 'BRANCH'; name: string; province: string; ward: string;
  address: string; contact_name: string; contact_position: string;
  contact_phone: string; email: string; school_phone: string; note: string;
};
type MainSchool = { id: number; school_code: string; name: string; province: string; ward: string };
type DraftDetail = {
  id: number; version: number; proposal_mode: 'NEW_MAIN' | 'ADD_BRANCHES';
  target_directory_school_id: number | null; units: Unit[];
};

const emptyUnit = (type: Unit['unit_type'], province = ''): Unit => ({
  unit_type: type, name: '', province, ward: '', address: '',
  contact_name: '', contact_position: '', contact_phone: '',
  email: '', school_phone: '', note: '',
});
const fields: { key: keyof Omit<Unit, 'unit_type'>; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Tên trường/phân hiệu', required: true },
  { key: 'province', label: 'Tỉnh/thành', required: true },
  { key: 'ward', label: 'Phường/xã', required: true },
  { key: 'address', label: 'Địa chỉ' },
  { key: 'contact_name', label: 'Người liên hệ' },
  { key: 'contact_position', label: 'Chức vụ' },
  { key: 'contact_phone', label: 'SĐT liên hệ' },
  { key: 'email', label: 'Email' },
  { key: 'school_phone', label: 'SĐT trường' },
];

export function SchoolProposalEditor({
  open, draftId, apiBase, token, onClose, onSaved,
}: {
  open: boolean; draftId: number | null; apiBase: string; token: string;
  onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [mode, setMode] = useState<'NEW_MAIN'|'ADD_BRANCHES'>('NEW_MAIN');
  const [units, setUnits] = useState<Unit[]>([emptyUnit('MAIN')]);
  const [target, setTarget] = useState<MainSchool | null>(null);
  const [lookup, setLookup] = useState('');
  const [choices, setChoices] = useState<MainSchool[]>([]);
  const [version, setVersion] = useState(1);
  const [expanded, setExpanded] = useState<number[]>([0]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const api = <T,>(url: string, options?: RequestInit) => channelRequest<T>(apiBase, token, url, options);

  useEffect(() => {
    if (!open) return;
    setMode('NEW_MAIN'); setUnits([emptyUnit('MAIN')]); setTarget(null);
    setLookup(''); setVersion(1); setExpanded([0]); setError(''); setFieldErrors({});
    if (draftId === null) return;
    let live = true;
    setLoading(true);
    void api<{data:DraftDetail}>(`/school-proposals/${draftId}/draft-detail`)
      .then(result => {
        if (!live) return;
        const draft = result.data;
        setMode(draft.proposal_mode); setVersion(draft.version);
        setUnits(draft.units.map(u => ({...emptyUnit(u.unit_type),...u})));
        setExpanded([0]);
        if (draft.target_directory_school_id)
          setTarget({id:draft.target_directory_school_id,school_code:'',name:'Trường chính đã chọn',province:'',ward:''});
      })
      .catch(cause => { if (live) setError(cause instanceof Error ? cause.message : 'Không tải được bản nháp.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open,draftId,apiBase,token]);

  useEffect(() => {
    if (!open || mode !== 'ADD_BRANCHES') return;
    let active = true;
    void api<{data:MainSchool[]}>(`/school-proposals/main-schools?search=${encodeURIComponent(lookup.trim())}`)
      .then(result => { if (active) {
        setChoices(result.data);
        if (target && !target.school_code) {
          const found = result.data.find(x=>x.id===target.id);
          if (found) setTarget(found);
        }
      }})
      .catch(cause=>{ if (active) setError(cause instanceof Error ? cause.message : 'Không tải được trường chính.'); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open,mode,lookup,apiBase,token]);

  const changeMode = (value: 'NEW_MAIN'|'ADD_BRANCHES') => {
    setMode(value); setTarget(null); setLookup(''); setFieldErrors({});
    setUnits(value==='NEW_MAIN'?[emptyUnit('MAIN')]:[emptyUnit('BRANCH')]);
    setExpanded([0]);
  };
  const editUnit = (index:number,key:keyof Unit,value:string) => {
    setUnits(items=>items.map((item,i)=>i===index?{...item,[key]:value}:item));
    setFieldErrors(current=>({...current,[`${index}.${key}`]:''}));
  };
  const addBranch = () => {
    setUnits(items=>[...items,emptyUnit('BRANCH',mode==='NEW_MAIN'?items[0]?.province:target?.province)]);
    setExpanded(current=>[...current,units.length]);
  };
  const removeBranch = (index:number) => {
    setUnits(items=>items.filter((_,i)=>i!==index));
    setExpanded([]);
  };
  const validate = () => {
    const errors:Record<string,string>={};
    if(mode==='ADD_BRANCHES' && !target?.id) errors.target='Cần chọn trường chính đã tồn tại.';
    if(!units.length) errors.units='Cần ít nhất một phân hiệu.';
    units.forEach((u,i)=>{
      for(const field of fields) {
        const value=u[field.key]?.trim()??'';
        if(field.required&&!value) errors[`${i}.${field.key}`]='Trường này là bắt buộc.';
        if(field.key==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          errors[`${i}.email`]='Email không đúng định dạng.';
        if((field.key==='contact_phone'||field.key==='school_phone')&&value
          && (value.replace(/\D/g,'').length<9||value.replace(/\D/g,'').length>15))
          errors[`${i}.${field.key}`]='Số điện thoại cần từ 9 đến 15 chữ số.';
      }
    });
    setFieldErrors(errors);
    if(Object.keys(errors).length) {
      const first=Object.keys(errors)[0];
      const index=Number(first.split('.')[0]);
      if(Number.isInteger(index)) setExpanded(values=>[...new Set([...values,index])]);
      setError('Vui lòng kiểm tra các trường thông tin chưa hợp lệ.');
      return false;
    }
    return true;
  };
  const save = async () => {
    // Drafts may be incomplete, but every provided email/phone must still be well-formed.
    if(!validate()) return;
    setBusy(true); setError('');
    try {
      const payload={
        idempotency_key:crypto.randomUUID(), proposal_mode:mode,
        target_directory_school_id:mode==='ADD_BRANCHES'?target?.id:null,
        units, ...(draftId!==null?{expected_version:version}:{})
      };
      await api(draftId===null?'/school-proposals/drafts':`/school-proposals/${draftId}/draft`,{
        method:draftId===null?'POST':'PATCH',body:JSON.stringify(payload)
      });
      await onSaved(); onClose();
    } catch(cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được bản nháp.');
    } finally { setBusy(false); }
  };
  const unitForm = (u:Unit,i:number) => <div key={i} className="grid gap-3 sm:grid-cols-2">
    {fields.map(field=><label key={field.key} className="block min-w-0 text-sm">
      {field.label} {field.required&&<span className="text-destructive">*</span>}
      <Input className="mt-1" value={u[field.key]} maxLength={field.key==='email'?190:field.key==='province'||field.key==='ward'?100:field.key==='contact_position'?120:field.key==='contact_phone'||field.key==='school_phone'?40:500}
        aria-invalid={!!fieldErrors[`${i}.${field.key}`]}
        onChange={e=>editUnit(i,field.key,e.target.value)}/>
      {fieldErrors[`${i}.${field.key}`]&&<span className="mt-1 block text-xs text-destructive">{fieldErrors[`${i}.${field.key}`]}</span>}
    </label>)}
    <label className="block text-sm sm:col-span-2">Ghi chú <span className="text-muted-foreground">(không bắt buộc)</span>
      <Textarea className="mt-1" rows={3} maxLength={4000}
        placeholder="Nhập ghi chú về trường học hoặc phân hiệu..."
        value={u.note} onChange={e=>editUnit(i,'note',e.target.value)}/>
    </label>
  </div>;

  return <AppDialog open={open} onOpenChange={value=>{if(!value&&!busy)onClose()}}
    busy={busy} title={draftId===null?'Đề xuất trường học':'Chỉnh sửa hồ sơ trường'}
    description="Một hồ sơ có thể gồm trường chính và nhiều phân hiệu. Lưu trường chỉ tạo bản nháp."
    contentClassName="sm:max-w-3xl" footer={<>
      <AppButton tone="neutral" disabled={busy} onClick={onClose}>Hủy</AppButton>
      <AppButton busy={busy||loading} onClick={()=>void save()}>{draftId===null?'Lưu trường':'Lưu thay đổi'}</AppButton>
    </>}>
    {loading?<p className="py-8 text-sm text-muted-foreground">Đang tải hồ sơ...</p>:
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="font-semibold">Loại đề xuất</legend>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="proposal-mode" checked={mode==='NEW_MAIN'} onChange={()=>changeMode('NEW_MAIN')}/> Trường chính mới (có thể kèm phân hiệu)</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="proposal-mode" checked={mode==='ADD_BRANCHES'} onChange={()=>changeMode('ADD_BRANCHES')}/> Bổ sung phân hiệu cho trường chính đã có</label>
      </fieldset>
      {mode==='NEW_MAIN'?<section className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <h3 className="font-semibold">Trường chính</h3>
        <p className="text-xs text-muted-foreground">Mã trường chính sẽ được hệ thống cấp khi Admin phê duyệt.</p>
        {unitForm(units[0],0)}
      </section>:<section className="space-y-2 rounded-xl border p-4">
        <h3 className="font-semibold">Chọn trường chính đã có *</h3>
        <Input aria-label="Tìm trường chính" placeholder="Tìm theo tên hoặc mã trường chính"
          value={lookup} onChange={e=>setLookup(e.target.value)}/>
        {target&&<p className="text-sm font-medium text-green-700">Đã chọn: {target.name} {target.school_code&&`(${target.school_code})`}</p>}
        <div className="max-h-36 space-y-1 overflow-y-auto">
          {choices.map(x=><button type="button" key={x.id} onClick={()=>{setTarget(x);setLookup(x.name);setError('');}}
            className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted">
            <span className="font-medium">{x.name}</span><span className="block text-xs text-muted-foreground">{x.school_code} · {x.province} · {x.ward}</span>
          </button>)}
        </div>
        {fieldErrors.target&&<p className="text-xs text-destructive">{fieldErrors.target}</p>}
      </section>}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Danh sách phân hiệu ({units.filter(x=>x.unit_type==='BRANCH').length})</h3>
          <AppButton tone="outline" size="sm" onClick={addBranch} disabled={units.length>=50}>
            <Plus className="size-4"/> Thêm phân hiệu
          </AppButton>
        </div>
        {units.map((u,i)=>u.unit_type==='BRANCH'&&<div key={i} className="rounded-xl border">
          <div className="flex items-center justify-between gap-2 p-3">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium"
              onClick={()=>setExpanded(values=>values.includes(i)?values.filter(x=>x!==i):[...values,i])}>
              {expanded.includes(i)?<ChevronUp className="size-4"/>:<ChevronDown className="size-4"/>}
              <span className="truncate">{u.name||`Phân hiệu ${i+(mode==='NEW_MAIN'?0:1)}`}</span>
            </button>
            <button type="button" title="Xóa phân hiệu khỏi bản nháp" aria-label="Xóa phân hiệu"
              onClick={()=>removeBranch(i)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
              <Trash2 className="size-4"/>
            </button>
          </div>
          {expanded.includes(i)&&<div className="border-t p-4">{unitForm(u,i)}</div>}
        </div>)}
        {units.every(u=>u.unit_type!=='BRANCH')&&<p className="text-sm text-muted-foreground">Chưa có phân hiệu. Có thể lưu trường chính trước.</p>}
        {fieldErrors.units&&<p className="text-sm text-destructive">{fieldErrors.units}</p>}
      </section>
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>}
  </AppDialog>;
}
