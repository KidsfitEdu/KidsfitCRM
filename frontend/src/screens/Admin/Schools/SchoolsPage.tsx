'use client';

import { useState } from 'react';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { SchoolDirectory } from '@/components/crm/school-directory';
import { SchoolRecordEditor } from '@/components/crm/schools/school-record-editor';
import { AppButton } from '@/components/common/buttons/app-button';
import { appNotice } from '@/components/common/app-toast-provider';
import { AdminPageStatus } from '@/components/admin/AdminPageStatus';
import type { AdminPageProps } from '../types';

export function SchoolsPage({apiBase,token,abilities,onChanged}:AdminPageProps) {
  const queryClient=useQueryClient();
  const [editorOpen,setEditorOpen]=useState(false);
  const [schoolId,setSchoolId]=useState<number|null>(null);
  const preview=!apiBase;
  const openEditor=(id:number|null)=>{
    setSchoolId(id);
    setEditorOpen(true);
  };
  const saved=async()=>{
    try {
      await queryClient.invalidateQueries();
      await onChanged();
      appNotice.success(schoolId===null?'Đã thêm trường học.':'Đã cập nhật trường học.');
    } catch(e) {
      appNotice.warning('Đã lưu hồ sơ, nhưng chưa tải lại được danh sách.',
        e instanceof Error?e.message:'Vui lòng tải lại trang.');
    }
  };
  return <AdminPageStatus apiBase={apiBase}>
    <>
      <SchoolRecordEditor open={editorOpen} schoolId={schoolId} apiBase={apiBase} token={token}
        onClose={()=>setEditorOpen(false)} onSaved={saved}/>
      <SchoolDirectory adminMode apiBase={apiBase} token={token} abilities={abilities}
        onChanged={onChanged} onEditSchool={id=>openEditor(id)}
        renderImportAction={openImport => <div className="flex flex-wrap items-center justify-end gap-2">
          <AppButton tone="green" premium className="h-11 px-5" disabled={preview}
            leadingIcon={<Plus className="size-4"/>} onClick={()=>openEditor(null)}>Thêm trường</AppButton>
          <AppButton tone="blue" premium className="h-11 px-5" disabled={preview}
            leadingIcon={<FileSpreadsheet className="size-4"/>} onClick={openImport}>Import Excel</AppButton>
        </div>}/>
    </>
  </AdminPageStatus>;
}
