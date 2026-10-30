'use client';

import { useState } from 'react';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SchoolDirectory } from '@/components/crm/school-directory';
import { AppButton } from '@/components/common/app-button';
import { FormActions } from '@/components/common/form-actions';
import { FormError } from '@/components/common/form-error';
import { appNotice } from '@/components/common/app-toast-provider';
import { createManualSchool } from '@/src/services/school.service';
import { AdminPageStatus } from '@/src/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function SchoolsPage({apiBase,token,abilities,onChanged}:AdminPageProps) {
  const queryClient=useQueryClient();
  const [manualOpen,setManualOpen]=useState(false);
  const [manual,setManual]=useState<Record<string,string>>({unit_type:'MAIN'});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [formErrors,setFormErrors]=useState<Record<string,string>>({});
  const preview=!apiBase;
  const createManual=async()=>{
    const errs:Record<string,string>={};
    for(const key of ['school_code','name','province','ward','reason'])if(!manual[key]?.trim())errs[key]='Trường này là bắt buộc.';
    if(manual.email?.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manual.email.trim()))errs.email='Email không đúng định dạng.';
    if(manual.reason?.trim()&&manual.reason.trim().length<3)errs.reason='Vui lòng nêu lý do ít nhất 3 ký tự.';
    setFormErrors(errs);if(Object.keys(errs).length)return;
    setBusy(true);setError('');
    try {await createManualSchool(apiBase,token,manual);setManual({unit_type:'MAIN'});setManualOpen(false);appNotice.success('Đã thêm trường thành công.');await queryClient.invalidateQueries();await onChanged();}
    catch(e){setError(e instanceof Error?e.message:'Không lưu được trường.');}
    finally{setBusy(false);}
  };
  return <AdminPageStatus apiBase={apiBase} error={error}>
    <>
      <Dialog open={manualOpen} onOpenChange={open => { if (!busy) setManualOpen(open); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Thêm trường học</DialogTitle><DialogDescription>Tạo trường chính hoặc phân hiệu thuộc trường chính đã có.</DialogDescription></DialogHeader><div className="space-y-3">
        
        <p className="mb-3 text-xs text-muted-foreground">Với phân hiệu, nhập mã trường chính đã có để liên kết.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Loại đơn vị<select className="mt-1 w-full rounded-lg border bg-background p-2" value={manual.unit_type||'MAIN'} onChange={e=>setManual(m=>({...m,unit_type:e.target.value}))}><option value="MAIN">Trường chính</option><option value="BRANCH">Phân hiệu</option></select></label>
          {(['school_code','name','province','ward','address','contact_name','contact_position','contact_phone','email','school_phone','reason'] as const).map(k=><label className="text-sm" key={k}>{({school_code:'Mã trường chính',name:'Tên trường/phân hiệu',province:'Tỉnh/thành',ward:'Phường/xã',address:'Địa chỉ',contact_name:'Người liên hệ',contact_position:'Chức vụ',contact_phone:'SĐT liên hệ',email:'Email',school_phone:'SĐT trường',reason:'Lý do tạo'} as Record<string,string>)[k]}<Input className="mt-1" aria-invalid={!!formErrors[k]} value={manual[k]||''} onChange={e=>{setManual(m=>({...m,[k]:e.target.value}));setFormErrors(x=>({...x,[k]:''}));}}/><FormError>{formErrors[k]}</FormError></label>)}
        </div>
        <FormActions busy={busy} onCancel={()=>setManualOpen(false)} onSave={()=>void createManual()} saveLabel="Lưu trường"/>
      </div></DialogContent></Dialog>
      <SchoolDirectory adminMode apiBase={apiBase} token={token} abilities={abilities} onChanged={onChanged}
        renderImportAction={openImport => <div className="flex flex-wrap items-center justify-end gap-2">
          <AppButton tone="green" premium className="h-11 px-5" disabled={preview} leadingIcon={<Plus className="size-4"/>}
            onClick={() => {setFormErrors({});setManualOpen(true);}}>Thêm trường</AppButton>
          <AppButton tone="blue" premium className="h-11 px-5" disabled={preview} leadingIcon={<FileSpreadsheet className="size-4"/>}
            onClick={openImport}>Import Excel</AppButton>
        </div>}/>
    </>
  </AdminPageStatus>;
}
