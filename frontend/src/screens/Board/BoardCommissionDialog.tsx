'use client';

import { useEffect, useState } from 'react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppNativeSelect } from '@/components/common/app-native-select';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';

export type CommissionScope = 'SYSTEM' | 'MANAGER' | 'SALES';
export type CommissionFormValues = {
  scope:CommissionScope; organizationId:number|null; managerUserId:number|null; salesUserId:number|null;
  salesPercent:string;managerPercent:string;expectedVersionId:number|null;
};
export type CommissionOrganization={id:number;name:string;code:string};
export type CommissionManager={id:number;organizationId:number;name:string;email:string;code:string};
export type CommissionSales={userId:number;organizationId:number;managerUserId:number|null;name:string;email:string;code:string};

export function BoardCommissionDialog({
  initial,organizations,managers,sales,busy,error,lockTarget=false,onClose,onSave
}:{
  initial:CommissionFormValues|null;
  organizations:CommissionOrganization[];managers:CommissionManager[];sales:CommissionSales[];
  busy:boolean;error:string;lockTarget?:boolean;onClose:()=>void;onSave:(form:CommissionFormValues)=>void;
}){
  const [form,setForm]=useState<CommissionFormValues|null>(initial);
  const [localError,setLocalError]=useState('');
  useEffect(()=>{queueMicrotask(()=>{setForm(initial);setLocalError('');});},[initial]);
  const valid=(v:string)=>v.trim()!==''&&Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100
    &&Math.round(Number(v)*10000)===Number(v)*10000;
  const submit=()=>{
    if(!form)return;
    if(form.scope!=='SYSTEM'&&!form.organizationId){setLocalError('Vui lòng chọn tổ chức.');return;}
    if(form.scope==='MANAGER'&&!form.managerUserId){setLocalError('Vui lòng chọn Quản lý.');return;}
    if(form.scope==='SALES'&&!form.salesUserId){setLocalError('Vui lòng chọn Sales.');return;}
    if(!valid(form.salesPercent)||!valid(form.managerPercent)
      ||Number(form.salesPercent)+Number(form.managerPercent)>100){
      setLocalError('Tỷ lệ phải từ 0–100%, tổng không vượt 100%, tối đa 4 chữ số thập phân.');return;
    }
    setLocalError('');onSave(form);
  };
  const members=sales.filter(s=>!form?.organizationId||s.organizationId===form.organizationId);
  const managerOptions=managers.filter(m=>m.organizationId===form?.organizationId);
  const availableSales=members.filter(s=>!form?.managerUserId||s.managerUserId===form.managerUserId);
  const chosenSales=sales.find(s=>s.userId===form?.salesUserId&&s.organizationId===form?.organizationId);
  return <AppDialog open={initial!==null} busy={busy} onOpenChange={v=>{if(!v)onClose();}}
    title={form?.scope==='SYSTEM'?'Chỉnh sửa hoa hồng mặc định':form?.scope==='MANAGER'?'Điều chỉnh theo Quản lý':'Điều chỉnh hoa hồng Sales'}
    description="Thay đổi được áp dụng ngay khi lưu thành công và tự động ghi nhật ký."
    footer={<><AppButton tone="neutral" disabled={busy} onClick={onClose}>Hủy</AppButton>
      <AppButton busy={busy} onClick={submit}>Lưu &amp; áp dụng</AppButton></>}>
    {form&&<div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="board-commission-scope" className="text-sm font-medium">Phạm vi áp dụng *</label>
        <AppNativeSelect id="board-commission-scope" containerClassName="w-full" value={form.scope}
          disabled={busy||lockTarget||form.expectedVersionId!==null}
          onChange={e=>setForm(f=>f?{...f,scope:e.target.value as CommissionScope,organizationId:null,managerUserId:null,salesUserId:null,expectedVersionId:null}:f)}>
          <option value="SYSTEM">Mặc định toàn hệ thống</option>
          <option value="MANAGER">Theo Quản lý bán hàng</option>
          <option value="SALES">Riêng từng Sales / CTV</option>
        </AppNativeSelect>
      </div>
      {form.scope!=='SYSTEM'&&<>
        <div className="space-y-1.5">
          <label htmlFor="board-commission-org" className="text-sm font-medium">Tổ chức *</label>
          <AppNativeSelect id="board-commission-org" containerClassName="w-full" value={form.organizationId??0}
            disabled={busy||lockTarget||form.expectedVersionId!==null}
            onChange={e=>setForm(f=>f?{...f,organizationId:Number(e.target.value)||null,managerUserId:null,salesUserId:null}:f)}>
            <option value={0}>Chọn tổ chức</option>
            {organizations.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
          </AppNativeSelect>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="board-commission-manager" className="text-sm font-medium">Quản lý phụ trách {form.scope==='MANAGER'?'*':''}</label>
          <AppNativeSelect id="board-commission-manager" containerClassName="w-full" value={form.managerUserId??0}
            disabled={busy||!form.organizationId||lockTarget||form.expectedVersionId!==null}
            onChange={e=>setForm(f=>f?{...f,managerUserId:Number(e.target.value)||null,salesUserId:null}:f)}>
            <option value={0}>{form.scope==='MANAGER'?'Chọn Quản lý':'Tất cả Quản lý'}</option>
            {managerOptions.map(m=><option key={m.organizationId+'-'+m.id} value={m.id}>{m.name} · {m.email}</option>)}
          </AppNativeSelect>
        </div>
        {form.scope==='SALES'&&<div className="space-y-1.5">
          <label htmlFor="board-commission-sales" className="text-sm font-medium">Sales / CTV *</label>
          <AppNativeSelect id="board-commission-sales" containerClassName="w-full" value={form.salesUserId??0}
            disabled={busy||!form.organizationId||lockTarget||form.expectedVersionId!==null}
            onChange={e=>setForm(f=>f?{...f,salesUserId:Number(e.target.value)||null}:f)}>
            <option value={0}>Chọn Sales theo tên hoặc email</option>
            {availableSales.map(s=><option key={s.userId} value={s.userId}>{s.name} · {s.email}</option>)}
          </AppNativeSelect>
          {chosenSales&&<p className="text-xs text-muted-foreground">{chosenSales.name} · {chosenSales.email}</p>}
        </div>}
      </>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="board-commission-sales-percent" className="text-sm font-medium">Sales hưởng (%) *</label>
          <Input id="board-commission-sales-percent" type="number" min={0} max={100} step="0.0001"
            value={form.salesPercent} disabled={busy}
            onChange={e=>setForm(f=>f?{...f,salesPercent:e.target.value}:f)}/>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="board-commission-manager-percent" className="text-sm font-medium">Quản lý hưởng (%) *</label>
          <Input id="board-commission-manager-percent" type="number" min={0} max={100} step="0.0001"
            value={form.managerPercent} disabled={busy}
            onChange={e=>setForm(f=>f?{...f,managerPercent:e.target.value}:f)}/>
        </div>
      </div>
      <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-sm">
        Tổng tỷ lệ sau điều chỉnh: <strong className="tabular-nums">{Number(form.salesPercent)+Number(form.managerPercent)}%</strong>
      </div>
      {(localError||error)&&<p role="alert" className="text-sm text-destructive">{localError||error}</p>}
    </div>}
  </AppDialog>;
}
