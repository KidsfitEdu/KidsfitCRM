'use client';

import { useEffect, useState } from 'react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { AppNativeSelect } from '@/components/common/app-native-select';
import type { WorkflowPolicy } from '@/lib/school-operations';

export type PolicyForm = {
  organization_id:number;
  manager_review_hours:number;
  admin_review_hours:number;
  invitation_hours:number;
  max_extension_days:number;
  max_extension_count:number;
  max_total_extension_days:number;
};
export const initialPolicy = (organizationId:number): PolicyForm => ({
  organization_id:organizationId,manager_review_hours:24,admin_review_hours:48,invitation_hours:24,
  max_extension_days:7,max_extension_count:3,max_total_extension_days:21,
});

type Props = {
  open:boolean; onClose:()=>void; busy:boolean;
  policy:WorkflowPolicy|null;
  organizations:{id:number;name:string;status?:string}[];
  onSave:(form:PolicyForm)=>void;
};
export function PolicyEditorDialog({open,onClose,busy,policy,organizations,onSave}:Props) {
  const [form,setForm]=useState<PolicyForm>(initialPolicy(0));
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!open)return;
    setForm(policy?{
      organization_id:policy.organization_id,manager_review_hours:policy.manager_review_hours,
      admin_review_hours:policy.admin_review_hours,invitation_hours:policy.invitation_hours,
      max_extension_days:policy.max_extension_days,max_extension_count:policy.max_extension_count,
      max_total_extension_days:policy.max_total_extension_days,
    }:initialPolicy(0));
    setError('');
  },[open,policy,organizations]);
  const numeric:(keyof PolicyForm)[]=['manager_review_hours','admin_review_hours','invitation_hours',
    'max_extension_days','max_extension_count','max_total_extension_days'];
  const submit=()=>{
    if(!form.organization_id){setError('Vui lòng chọn tổ chức.');return;}
    if(numeric.some(key=>!Number.isInteger(form[key] as number)||(form[key] as number)<=0)){
      setError('Các giới hạn phải là số nguyên dương.');return;
    }
    if(form.max_total_extension_days < form.max_extension_days){setError('Tổng gia hạn không thể nhỏ hơn số ngày mỗi lần.');return;}
    setError('');onSave(form);
  };
  const fields:[
    keyof PolicyForm,string
  ][]=[
    ['manager_review_hours','Quản lý phản hồi (giờ)'],
    ['admin_review_hours','Admin phản hồi (giờ)'],
    ['invitation_hours','Hạn phản hồi phân bổ (giờ)'],
    ['max_extension_days','Ngày gia hạn mỗi lần'],
    ['max_extension_count','Số lần gia hạn tối đa'],
    ['max_total_extension_days','Tổng ngày gia hạn'],
  ];
  return <AppDialog open={open} onOpenChange={v=>{if(!v)onClose();}} busy={busy}
    title={policy?'Chỉnh sửa bản nháp chính sách':'Thêm chính sách vận hành'}
    footer={<><AppButton tone="neutral" disabled={busy} onClick={onClose}>Hủy</AppButton>
      <AppButton busy={busy} onClick={submit}>Lưu bản nháp</AppButton></>}>
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="board-policy-organization">Tổ chức *</label>
        <AppNativeSelect id="board-policy-organization" containerClassName="w-full" value={form.organization_id}
          disabled={!!policy||busy} onChange={e=>setForm(v=>({...v,organization_id:Number(e.target.value)}))}>
          {!policy&&<option value={0}>Chọn tổ chức</option>}
          {organizations.map(o=>
            <option key={o.id} value={o.id}>{o.name}</option>)}
        </AppNativeSelect>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(([key,label])=><div key={key} className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor={'board-policy-'+key}>{label} *</label>
          <Input id={'board-policy-'+key} type="number" min={1} step={1} value={form[key]}
            onChange={e=>setForm(v=>({...v,[key]:Number(e.target.value)}))}/>
        </div>)}
      </div>
      {error&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  </AppDialog>;
}
