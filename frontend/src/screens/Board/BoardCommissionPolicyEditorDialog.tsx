'use client';

import { useEffect, useState } from 'react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { Input } from '@/components/ui/input';

export type CommissionForm = {
  organizationId:number; managerUserId:string; salesUserId:string; applyScope:'SYSTEM'|'ORGANIZATION';
  salesPercent:string; managerPercent:string; ceilingPercent:string; managerCeilingPercent:string;
};
export type CommissionOrganization={id:number;name:string;code:string};
export type CommissionMember={userId:number;organizationId:number;managerUserId:number|null;name:string};

type Props={
  open:boolean; busy:boolean; onClose:()=>void; onSave:(form:CommissionForm)=>void;
  initial:CommissionForm|null; organizations:CommissionOrganization[]; members:CommissionMember[];
  error?:string; isReplacement?:boolean;
};

const valid=(value:string)=>value.trim()!=='' && Number.isFinite(Number(value))
  && Number(value)>=0 && Number(value)<=100 && Math.round(Number(value)*10000)===Number(value)*10000;

export function BoardCommissionPolicyEditorDialog({
  open,busy,onClose,onSave,initial,organizations,members,error,isReplacement=false
}:Props){
  const [form,setForm]=useState<CommissionForm|null>(initial);
  const [validation,setValidation]=useState('');
  useEffect(()=>{
    if(!open)return;
    queueMicrotask(()=>{setForm(initial);setValidation('');});
  },[open,initial]);
  if(!form)return null;
  const managers=members.filter(m=>m.organizationId===form.organizationId
    && members.some(s=>s.organizationId===m.organizationId&&s.managerUserId===m.userId));
  const sales=members.filter(m=>m.organizationId===form.organizationId
    && String(m.managerUserId)===form.managerUserId);
  const sum=Number(form.salesPercent)+Number(form.managerPercent);
  const submit=()=>{
    if(!form.organizationId){setValidation('Vui lòng chọn tổ chức.');return;}
    if(![form.salesPercent,form.managerPercent,form.ceilingPercent,form.managerCeilingPercent].every(valid)){
      setValidation('Tỷ lệ phải nằm trong khoảng 0–100%, tối đa 4 chữ số thập phân.');return;
    }
    if(sum>Number(form.ceilingPercent)){
      setValidation('Tổng hoa hồng Sales và Quản lý không được vượt hạn mức.');return;
    }
    if(Number(form.managerPercent)>Number(form.managerCeilingPercent)
      ||Number(form.managerCeilingPercent)>Number(form.ceilingPercent)){
      setValidation('Trần riêng Quản lý không được nhỏ hơn phần Quản lý mặc định hoặc lớn hơn hạn mức tổng.');return;
    }
    setValidation('');onSave(form);
  };
  const field=(key:'salesPercent'|'managerPercent'|'ceilingPercent'|'managerCeilingPercent',label:string)=>
    <div className="space-y-1.5">
      <label htmlFor={'commission-'+key} className="text-sm font-medium">{label} *</label>
      <Input id={'commission-'+key} required type="number" min={0} max={100} step="0.0001"
        value={form[key]} disabled={busy}
        onChange={e=>setForm(x=>x?{...x,[key]:e.target.value}:x)}/>
    </div>;
  return <AppDialog open={open} onOpenChange={v=>{if(!v)onClose();}} busy={busy}
    title={isReplacement?'Điều chỉnh chính sách hoa hồng':'Thêm chính sách hoa hồng'}
    description="Lưu thành công sẽ áp dụng ngay. Hệ thống tự lưu người thao tác và lịch sử phiên bản."
    footer={<>
      <AppButton type="button" tone="neutral" disabled={busy} onClick={onClose}>Hủy</AppButton>
      <AppButton type="button" busy={busy} onClick={submit}>Lưu &amp; áp dụng</AppButton>
    </>}>
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="commission-scope" className="text-sm font-medium">Phạm vi áp dụng *</label>
        <AppNativeSelect id="commission-scope" containerClassName="w-full" disabled={busy}
          value={form.applyScope} onChange={e=>{
            const system=e.target.value==='SYSTEM';
            setForm(x=>x?{...x,applyScope:system?'SYSTEM':'ORGANIZATION',
              organizationId:system?(organizations.find(o=>o.code==='KIDSFIT')?.id??0):x.organizationId,
              managerUserId:'',salesUserId:''}:x);
          }}>
          <option value="SYSTEM">Mặc định toàn hệ thống</option>
          <option value="ORGANIZATION">Theo đối tác / Quản lý / Sales</option>
        </AppNativeSelect>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="commission-organization" className="text-sm font-medium">Tổ chức / đối tác *</label>
        <AppNativeSelect id="commission-organization" containerClassName="w-full"
          disabled={busy||form.applyScope==='SYSTEM'} value={form.organizationId}
          onChange={e=>setForm(x=>x?{...x,organizationId:Number(e.target.value),managerUserId:'',salesUserId:''}:x)}>
          <option value={0}>Chọn tổ chức</option>
          {organizations.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
        </AppNativeSelect>
      </div>
      {form.applyScope==='ORGANIZATION'&&<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="commission-manager" className="text-sm font-medium">Quản lý bán hàng</label>
          <AppNativeSelect id="commission-manager" containerClassName="w-full" disabled={busy}
            value={form.managerUserId} onChange={e=>setForm(x=>x?{...x,managerUserId:e.target.value,salesUserId:''}:x)}>
            <option value="">Mặc định toàn tổ chức</option>
            {managers.map(m=><option key={m.userId} value={m.userId}>{m.name}</option>)}
          </AppNativeSelect>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="commission-sales" className="text-sm font-medium">Sales</label>
          <AppNativeSelect id="commission-sales" containerClassName="w-full"
            disabled={busy||!form.managerUserId} value={form.salesUserId}
            onChange={e=>setForm(x=>x?{...x,salesUserId:e.target.value}:x)}>
            <option value="">Áp dụng cho cả nhóm</option>
            {sales.map(s=><option key={s.userId} value={s.userId}>{s.name}</option>)}
          </AppNativeSelect>
        </div>
      </div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field('salesPercent','Hoa hồng Sales (%)')}
        {field('managerPercent','Hoa hồng Quản lý (%)')}
        {field('ceilingPercent','Tổng hạn mức (%)')}
        {field('managerCeilingPercent','Trần riêng Quản lý (%)')}
      </div>
      <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
        Tổng phân bổ mặc định: <strong className={sum>Number(form.ceilingPercent)?'text-destructive':'text-green-700 dark:text-green-300'}>{sum}%</strong>
        {' '}/ Hạn mức BGĐ: <strong>{form.ceilingPercent}%</strong>
      </p>
      {(validation||error)&&<p role="alert" className="text-sm text-destructive">{validation||error}</p>}
    </div>
  </AppDialog>;
}
