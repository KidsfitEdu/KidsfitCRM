'use client';

import { useEffect, useState } from 'react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { ChannelRequestError, channelRequest } from '@/lib/channel-operations';
import { appNotice } from '@/components/common/app-toast-provider';
import {
  SchoolBranchList, SchoolMainSection, emptySchoolUnit, schoolUnitFields, type SchoolFormUnit,
} from './school-units-editor';

type Detail = {
  id:number; school_code:string;
  units: Array<SchoolFormUnit & {id:number;version:number}>;
};

export function SchoolRecordEditor({open,schoolId,apiBase,token,onClose,onSaved}:{
  open:boolean; schoolId:number|null; apiBase:string; token:string;
  onClose:()=>void; onSaved:()=>Promise<void>;
}) {
  const [units,setUnits]=useState<SchoolFormUnit[]>([emptySchoolUnit('MAIN')]);
  const [expanded,setExpanded]=useState<number[]>([]);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const request = <T,>(path:string,options?:RequestInit)=>
    channelRequest<T>(apiBase,token,path,options);

  useEffect(()=>{
    if(!open)return;
    setUnits([emptySchoolUnit('MAIN')]);setExpanded([]);setErrors({});
    if(schoolId===null)return;
    let active=true;setLoading(true);
    void request<Detail>(`/schools/${schoolId}`).then(detail=>{
      if(!active)return;
      setUnits(detail.units.map(unit=>({...emptySchoolUnit(unit.unit_type),...unit,expected_version:unit.version})));
    }).catch(cause=>{if(active)appNotice.error('Không thể tải hồ sơ trường học.',cause instanceof Error?cause.message:'Vui lòng thử lại.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open,schoolId,apiBase,token]);

  const change=(index:number,key:keyof SchoolFormUnit,value:string)=>{
    setUnits(old=>old.map((item,i)=>i===index?{...item,[key]:value}:item));
    setErrors(old=>({...old,[`${index}.${key}`]:''}));
  };
  const addBranch=()=>{
    if(units.length>=50)return;
    setUnits(current=>[...current,emptySchoolUnit('BRANCH',current.find(x=>x.unit_type==='MAIN')?.province)]);
    setExpanded(current=>[...current,units.length]);
  };
  const removeBranch=(index:number)=>{
    if(units[index]?.id)return;
    setUnits(current=>current.filter((_,i)=>i!==index));
    setExpanded([]);
  };
  const validate=()=>{
    const next:Record<string,string>={};
    if(units.length===0||units.length>50||units.filter(x=>x.unit_type==='MAIN').length!==1)next.units='Cần một trường chính và tối đa 49 phân hiệu.';
    const seen=new Set<string>();
    units.forEach((u,i)=>{
      for(const field of schoolUnitFields){
        const value=u[field.key]?.trim()??'';
        if(field.required&&!value)next[`${i}.${field.key}`]='Trường này là bắt buộc.';
        if(field.key==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))next[`${i}.email`]='Email không đúng định dạng.';
        if((field.key==='contact_phone'||field.key==='school_phone')&&value){
          const digits=value.replace(/\D/g,'').length;
          if(digits<9||digits>15)next[`${i}.${field.key}`]='Số điện thoại phải có 9–15 chữ số.';
        }
      }
      const identity=[u.unit_type,u.name.trim(),u.province.trim(),u.ward.trim()].join('|').toLowerCase();
      if(seen.has(identity))next[`${i}.name`]='Đơn vị trùng tên và địa bàn trong hồ sơ.';
      seen.add(identity);
    });
    setErrors(next);
    if(Object.keys(next).length) {
      const index=Number(Object.keys(next).find(k=>/^\d+\./.test(k))?.split('.')[0]);
      if(Number.isInteger(index)&&units[index]?.unit_type==='BRANCH')setExpanded(prev=>[...new Set([...prev,index])]);
      return false;
    }
    return true;
  };
  const save=async()=>{
    if(!validate()||busy||loading)return;
    setBusy(true);
    try {
      await request(schoolId===null?'/schools':`/schools/${schoolId}`,{
        method:schoolId===null?'POST':'PUT',
        body:JSON.stringify({units}),
      });
      await onSaved();
      onClose();
    }catch(cause){
      // Only input-specific 422 errors are rendered inline. All other failures use one toast.
      if (cause instanceof ChannelRequestError && cause.status === 422) {
        const mapped:Record<string,string> = {};
        for (const [field,messages] of Object.entries(cause.errors)) {
          const normalized = field.toLowerCase().replace(/^units\[(\d+)\]\./, '$1.');
          if (normalized === 'units' || /^\d+\.(name|province|ward|address|contact_name|contact_position|contact_phone|email|school_phone|note)$/.test(normalized))
            mapped[normalized] = messages[0] ?? 'Thông tin không hợp lệ.';
          else if (normalized === 'name' || normalized === 'province' || normalized === 'ward')
            mapped[`0.${normalized}`] = messages[0] ?? 'Thông tin không hợp lệ.';
        }
        if (Object.keys(mapped).length) {
          setErrors(mapped);
          const branchIndex = Number(Object.keys(mapped).find(k => /^\d+\./.test(k))?.split('.')[0]);
          if (Number.isInteger(branchIndex) && units[branchIndex]?.unit_type === 'BRANCH')
            setExpanded(current => [...new Set([...current,branchIndex])]);
          return;
        }
      }
      const message = cause instanceof ChannelRequestError && (cause.status === 404 || cause.status === 405)
        ? 'API lưu trường chưa khả dụng. Hãy cập nhật Backend chứa POST /schools và PUT /schools/{id}, sau đó khởi động lại.'
        : cause instanceof Error ? cause.message : 'Vui lòng thử lại.';
      appNotice.error('Không thể lưu hồ sơ trường học.', message);
    }finally{setBusy(false);}
  };
  const mainIndex=units.findIndex(x=>x.unit_type==='MAIN');
  return <AppDialog open={open} onOpenChange={value=>{if(!value&&!busy)onClose()}}
    busy={busy} contentClassName="sm:max-w-3xl"
    title={schoolId===null?'Thêm trường học':'Chỉnh sửa trường học'}
    description="Một hồ sơ gồm trường chính và các phân hiệu. Admin lưu trực tiếp vào danh bạ chính thức."
    footer={<>
      <AppButton tone="neutral" disabled={busy} onClick={onClose}>Hủy</AppButton>
      <AppButton busy={busy||loading} onClick={()=>void save()}>{schoolId===null?'Lưu trường':'Lưu thay đổi'}</AppButton>
    </>}>
    {loading?<p className="py-8 text-sm text-muted-foreground">Đang tải hồ sơ...</p>:
    <div className="space-y-5">
      {mainIndex>=0&&<SchoolMainSection unit={units[mainIndex]} index={mainIndex}
        onFieldChange={change} errors={errors} prefix="official-school"/>}
      <SchoolBranchList units={units} expanded={expanded} onExpandedChange={setExpanded}
        onAdd={addBranch} onRemove={removeBranch} onFieldChange={change}
        errors={errors} lockedExisting prefix="official-branch"/>
    </div>}
  </AppDialog>;
}
