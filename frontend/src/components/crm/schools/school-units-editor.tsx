'use client';

import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type SchoolFormUnit = {
  id?: number;
  expected_version?: number;
  unit_type: 'MAIN' | 'BRANCH';
  name: string; province: string; ward: string; address: string;
  contact_name: string; contact_position: string; contact_phone: string;
  email: string; school_phone: string; note: string;
};

export const emptySchoolUnit = (type: SchoolFormUnit['unit_type'], province = ''): SchoolFormUnit => ({
  unit_type: type, name: '', province, ward: '', address: '', contact_name: '',
  contact_position: '', contact_phone: '', email: '', school_phone: '', note: '',
});

export const schoolUnitFields: { key: keyof Omit<SchoolFormUnit, 'id' | 'expected_version' | 'unit_type'>; label: string; required?: boolean }[] = [
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

export function SchoolUnitFields({unit,index,onFieldChange,errors={},prefix='school'}: {
  unit: SchoolFormUnit; index: number;
  onFieldChange: (index:number,key:keyof SchoolFormUnit,value:string)=>void;
  errors?:Record<string,string>; prefix?:string;
}) {
  return <div className="grid gap-3 sm:grid-cols-2">
    {schoolUnitFields.map(field => <label key={field.key} className="block min-w-0 text-sm" htmlFor={`${prefix}-${index}-${field.key}`}>
      {field.key==='name' && unit.unit_type==='MAIN'?'Tên trường':field.label} {field.required&&<span className="text-destructive">*</span>}
      <Input id={`${prefix}-${index}-${field.key}`} className="mt-1" value={unit[field.key]??''}
        maxLength={field.key==='email'?190:field.key==='province'||field.key==='ward'?100:field.key==='contact_position'?120:field.key==='contact_phone'||field.key==='school_phone'?40:500}
        aria-invalid={!!errors[`${index}.${field.key}`]}
        onChange={e=>onFieldChange(index,field.key,e.target.value)}/>
      {errors[`${index}.${field.key}`]&&<span className="mt-1 block text-xs text-destructive">{errors[`${index}.${field.key}`]}</span>}
    </label>)}
    <label className="block text-sm sm:col-span-2" htmlFor={`${prefix}-${index}-note`}>
      Ghi chú <span className="text-muted-foreground">(không bắt buộc)</span>
      <Textarea id={`${prefix}-${index}-note`} className="mt-1" rows={3} maxLength={4000}
        placeholder="Nhập ghi chú về trường học hoặc phân hiệu..."
        value={unit.note} onChange={e=>onFieldChange(index,'note',e.target.value)}/>
    </label>
  </div>;
}

export function SchoolBranchList({units,expanded,onExpandedChange,onAdd,onRemove,onFieldChange,errors={},lockedExisting=false,prefix='school'}:{
  units:SchoolFormUnit[];
  expanded:number[];
  onExpandedChange:(next:number[])=>void;
  onAdd:()=>void; onRemove:(index:number)=>void;
  onFieldChange:(index:number,key:keyof SchoolFormUnit,value:string)=>void;
  errors?:Record<string,string>; lockedExisting?:boolean; prefix?:string;
}) {
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="font-semibold">Danh sách phân hiệu ({units.filter(x=>x.unit_type==='BRANCH').length})</h3>
      <AppButton tone="outline" size="sm" onClick={onAdd} disabled={units.length>=50}>
        <Plus className="size-4"/> Thêm phân hiệu
      </AppButton>
    </div>
    {units.map((unit,index)=>unit.unit_type==='BRANCH'&&<div key={unit.id??index} className="rounded-xl border">
      <div className="flex items-center justify-between gap-2 p-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium"
          aria-expanded={expanded.includes(index)}
          onClick={()=>onExpandedChange(expanded.includes(index)?expanded.filter(i=>i!==index):[...expanded,index])}>
          {expanded.includes(index)?<ChevronUp className="size-4"/>:<ChevronDown className="size-4"/>}
          <span className="truncate">{unit.name||`Phân hiệu ${units.slice(0,index+1).filter(x=>x.unit_type==='BRANCH').length}`}</span>
        </button>
        {(!lockedExisting||!unit.id)&&<button type="button" title="Bỏ phân hiệu" aria-label="Bỏ phân hiệu"
          onClick={()=>onRemove(index)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
          <Trash2 className="size-4"/>
        </button>}
      </div>
      {expanded.includes(index)&&<div className="border-t p-4">
        <SchoolUnitFields unit={unit} index={index} onFieldChange={onFieldChange} errors={errors} prefix={prefix}/>
      </div>}
    </div>)}
    {!units.some(x=>x.unit_type==='BRANCH')&&<p className="text-sm text-muted-foreground">Chưa có phân hiệu. Có thể lưu trường chính trước.</p>}
    {lockedExisting&&units.some(x=>x.unit_type==='BRANCH'&&!!x.id)&&
      <p className="text-xs text-muted-foreground">Phân hiệu đã lưu không được bỏ khỏi hồ sơ để bảo toàn dữ liệu và lịch sử.</p>}
    {errors.units&&<p className="text-sm text-destructive">{errors.units}</p>}
  </section>;
}
