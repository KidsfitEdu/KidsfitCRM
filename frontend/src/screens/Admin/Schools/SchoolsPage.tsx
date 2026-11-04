'use client';

import { useState } from 'react';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SchoolDirectory } from '@/components/crm/school-directory';
import { AppButton } from '@/components/common/buttons/app-button';
import { FormActions } from '@/components/common/form-actions';
import { FormError } from '@/components/common/form-error';
import { appNotice } from '@/components/common/app-toast-provider';
import { createManualSchool } from '@/services/school.service';
import { ChannelRequestError } from '@/lib/channel-operations';
import { AdminPageStatus } from '@/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function SchoolsPage({apiBase,token,abilities,onChanged}:AdminPageProps) {
  const queryClient=useQueryClient();
  const [manualOpen,setManualOpen]=useState(false);
  const [manual,setManual]=useState<Record<string,string>>({unit_type:'MAIN'});
  const [busy,setBusy]=useState(false);
  const [formErrors,setFormErrors]=useState<Record<string,string>>({});
  const [formError,setFormError]=useState('');
  const preview=!apiBase;
  const createManual=async()=>{
    const errs:Record<string,string>={};
    for(const key of ['school_code','name','province','ward'])if(!manual[key]?.trim())errs[key]='Trường này là bắt buộc.';
    if(manual.email?.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manual.email.trim()))errs.email='Email không đúng định dạng.';
    for(const key of ['contact_phone','school_phone'] as const) {
      const phone = manual[key]?.trim();
      if(phone && (phone.replace(/\D/g, '').length < 9 || phone.replace(/\D/g, '').length > 15))
        errs[key]='Số điện thoại cần từ 9 đến 15 chữ số.';
    }
    setFormErrors(errs);if(Object.keys(errs).length)return;
    setFormError('');
    setBusy(true);
    try {await createManualSchool(apiBase,token,manual);setManual({unit_type:'MAIN'});setManualOpen(false);appNotice.success('Đã thêm trường thành công.');try{await queryClient.invalidateQueries();await onChanged();}catch(e){appNotice.warning('Đã thêm trường, nhưng chưa tải lại được danh sách.',e instanceof Error?e.message:'Vui lòng mở lại trang.');}}
    catch(e){
      const message=e instanceof Error?e.message:'Vui lòng kiểm tra thông tin và thử lại.';
      const duplicateCode=e instanceof ChannelRequestError && e.status===409 && /mã trường.*(đã có|trùng)|trường đã ngừng sử dụng/i.test(message);
      if(duplicateCode) setFormErrors(current=>({...current,school_code:message}));
      else setFormError(message);
    }
    finally{setBusy(false);}
  };
  return <AdminPageStatus apiBase={apiBase}>
    <>
      <AppDialog open={manualOpen} onOpenChange={open => { if (!busy) { setManualOpen(open); setFormError(''); } }} busy={busy} title="Thêm trường học" description="Tạo trường chính hoặc phân hiệu thuộc trường chính đã có."><div className="space-y-3">
        
        <p className="mb-3 text-xs text-muted-foreground">Với phân hiệu, nhập mã trường chính đã có để liên kết.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Loại đơn vị<select className="mt-1 w-full rounded-lg border bg-background p-2" value={manual.unit_type||'MAIN'} onChange={e=>setManual(m=>({...m,unit_type:e.target.value}))}><option value="MAIN">Trường chính</option><option value="BRANCH">Phân hiệu</option></select></label>
          {(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email','school_phone'] as const).map(k=><label className="text-sm" key={k}>{({school_code:'Mã trường chính',name:'Tên trường/phân hiệu',province:'Tỉnh/thành',ward:'Phường/xã',address:'Địa chỉ',contact_name:'Người liên hệ',contact_position:'Chức vụ',contact_phone:'SĐT liên hệ',email:'Email',school_phone:'SĐT trường'} as Record<string,string>)[k]}<Input className="mt-1" aria-invalid={!!formErrors[k]} value={manual[k]||''} onChange={e=>{setManual(m=>({...m,[k]:e.target.value}));setFormErrors(x=>({...x,[k]:''}));}}/><FormError>{formErrors[k]}</FormError></label>)}
        </div>
        <label className="block text-sm">Ghi chú <span className="text-muted-foreground">(không bắt buộc)</span>
          <Textarea className="mt-1" rows={3} maxLength={4000}
            placeholder="Nhập ghi chú về trường học hoặc phân hiệu..."
            value={manual.note ?? ''}
            onChange={e=>setManual(m=>({...m,note:e.target.value}))}/>
        </label>
        {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
        <FormActions busy={busy} onCancel={()=>setManualOpen(false)} onSave={()=>void createManual()} saveLabel="Lưu trường"/>
      </div></AppDialog>
      <SchoolDirectory adminMode apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged}
        renderImportAction={openImport => <div className="flex flex-wrap items-center justify-end gap-2">
          <AppButton tone="green" premium className="h-11 px-5" disabled={preview} leadingIcon={<Plus className="size-4"/>}
            onClick={() => {setFormErrors({});setFormError('');setManualOpen(true);}}>Thêm trường</AppButton>
          <AppButton tone="blue" premium className="h-11 px-5" disabled={preview} leadingIcon={<FileSpreadsheet className="size-4"/>}
            onClick={openImport}>Import Excel</AppButton>
        </div>}/>
    </>
  </AdminPageStatus>;
}
