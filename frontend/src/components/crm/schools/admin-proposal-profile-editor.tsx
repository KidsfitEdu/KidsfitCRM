'use client';

import { useEffect, useState } from 'react';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { SchoolBranchList, SchoolUnitFields, emptySchoolUnit, schoolUnitFields, type SchoolFormUnit } from '@/components/crm/schools/school-units-editor';
import { fetchAdminProposalProfile, updateAdminProposalProfile, type AdminProposalProfile, type AdminProposalUnit } from '@/services/proposal.service';
import { appNotice } from '@/components/common/app-toast-provider';
import { ChannelRequestError } from '@/lib/channel-operations';

const editableUnit = (unit:AdminProposalUnit):SchoolFormUnit => ({
  ...emptySchoolUnit(unit.unit_type), ...Object.fromEntries(Object.entries(unit).map(([key,value])=>[key,value??'']))
});

export function AdminProposalProfileEditor({open,proposalId,apiBase,token,onClose,onSaved}:{
  open:boolean; proposalId:number|null; apiBase:string; token:string;
  onClose:()=>void; onSaved:()=>Promise<void>;
}) {
  const [profile,setProfile]=useState<AdminProposalProfile|null>(null);
  const [units,setUnits]=useState<SchoolFormUnit[]>([]);
  const [expanded,setExpanded]=useState<number[]>([]);
  const [reason,setReason]=useState('');
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if(!open || proposalId===null)return;
    let active=true;
    setLoading(true);setProfile(null);setUnits([]);setExpanded([]);setReason('');setErrors({});
    void fetchAdminProposalProfile(apiBase,token,proposalId).then(({data})=>{
      if(!active)return;
      setProfile(data);
      const initial=data.proposal_mode==='LEGACY'
        ? [{...emptySchoolUnit('MAIN'),name:data.name,province:data.province,ward:data.ward,address:data.address??'',
          contact_name:data.contact_name??'',contact_position:data.contact_position??'',contact_phone:data.contact_phone??'',
          email:data.email??''}]
        : data.units.map(editableUnit);
      setUnits(initial);
    }).catch(error=>{
      if(active)appNotice.error('Không thể tải đề xuất trường.',error instanceof Error?error.message:'Vui lòng thử lại.');
    }).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[open,proposalId,apiBase,token]);

  const change=(index:number,key:keyof SchoolFormUnit,value:string)=>{
    setUnits(previous=>previous.map((u,i)=>i===index?{...u,[key]:value}:u));
    setErrors(previous=>({...previous,[`${index}.${key}`]:''}));
  };
  const addBranch=()=>{
    if(units.length>=50)return;
    setExpanded(previous=>[...previous,units.length]);
    setUnits(previous=>[...previous,emptySchoolUnit('BRANCH',profile?.target?.province??previous.find(x=>x.unit_type==='MAIN')?.province)]);
  };
  const removeBranch=(index:number)=>{
    setUnits(previous=>previous.filter((_,i)=>i!==index));
    setExpanded([]);
  };
  const validate=()=>{
    const next:Record<string,string>={};
    if(!reason.trim())next.reason='Cần nhập lý do chỉnh sửa.';
    if(units.length===0||units.length>50)next.units='Hồ sơ phải chứa từ 1 đến 50 đơn vị.';
    const seen=new Set<string>();
    units.forEach((unit,i)=>{
      for(const field of schoolUnitFields){
        const value=unit[field.key]?.trim()??'';
        if(field.required&&!value)next[`${i}.${field.key}`]='Trường này là bắt buộc.';
        if(field.key==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))next[`${i}.email`]='Email không đúng định dạng.';
        if((field.key==='contact_phone'||field.key==='school_phone')&&value
          && (value.replace(/\D/g,'').length<9||value.replace(/\D/g,'').length>15))
          next[`${i}.${field.key}`]='Số điện thoại cần từ 9 đến 15 chữ số.';
      }
      const identity=[unit.unit_type,unit.name,unit.province,unit.ward].map(x=>x.trim().toLowerCase()).join('|');
      if(seen.has(identity))next[`${i}.name`]='Đơn vị trùng tên và địa bàn trong hồ sơ.';
      seen.add(identity);
    });
    if(profile?.proposal_mode==='ADD_BRANCHES' && units.some(x=>x.unit_type!=='BRANCH'))
      next.units='Đề xuất bổ sung phân hiệu chỉ được chứa các phân hiệu.';
    if(profile?.proposal_mode!=='ADD_BRANCHES' && units.filter(x=>x.unit_type==='MAIN').length!==1)
      next.units='Hồ sơ cần đúng một trường chính.';
    setErrors(next);
    if(Object.keys(next).length){
      const i=Number(Object.keys(next).find(x=>/^\d+\./.test(x))?.split('.')[0]);
      if(Number.isInteger(i)&&units[i]?.unit_type==='BRANCH')setExpanded(previous=>[...new Set([...previous,i])]);
      return false;
    }
    return true;
  };
  const save=async()=>{
    if(!profile || proposalId===null || busy || loading || !validate())return;
    setBusy(true);
    try {
      await updateAdminProposalProfile(apiBase,token,proposalId,{
        expected_version:profile.version,
        reason:reason.trim(),
        units:units.map(({unit_type,name,province,ward,address,contact_name,contact_position,contact_phone,email,school_phone,note})=>({
          unit_type,name:name.trim(),province:province.trim(),ward:ward.trim(),
          address,contact_name,contact_position,contact_phone,email,school_phone,note,
        }))
      });
      appNotice.success('Đã cập nhật đề xuất trường và lưu lịch sử.');
      await onSaved();
      onClose();
    }catch(error){
      if(error instanceof ChannelRequestError && error.status===422){
        const mapped:Record<string,string>={};
        for(const [field,messages] of Object.entries(error.errors)){
          const key=field.toLowerCase().replace(/^units\[(\d+)\]\./,'$1.');
          if(key==='reason'||key==='units'||/^\d+\.(name|province|ward|email|contact_phone|school_phone)$/.test(key))
            mapped[key]=messages[0]??'Thông tin không hợp lệ.';
        }
        if(Object.keys(mapped).length){setErrors(mapped);return;}
      }
      appNotice.error('Không thể lưu đề xuất trường.',error instanceof Error?error.message:'Vui lòng thử lại.');
    }finally{setBusy(false);}
  };
  const mainIndex=units.findIndex(x=>x.unit_type==='MAIN');
  const isBranches=profile?.proposal_mode==='ADD_BRANCHES';
  const isLegacy=profile?.proposal_mode==='LEGACY';
  return <AppDialog open={open} onOpenChange={value=>{if(!value&&!busy)onClose()}}
    title="Chỉnh sửa đề xuất trường" description="Cập nhật hồ sơ đang chờ Admin duyệt; chưa thay đổi danh bạ chính thức."
    busy={busy} contentClassName="sm:max-w-3xl"
    footer={<>
      <AppButton tone="neutral" disabled={busy} onClick={onClose}>Hủy</AppButton>
      <AppButton busy={busy||loading} onClick={()=>void save()}>Lưu thay đổi</AppButton>
    </>}>
    {loading?<p className="py-8 text-sm text-muted-foreground">Đang tải hồ sơ…</p>:
    profile?<div className="space-y-5">
      {isBranches?<section className="rounded-xl border bg-muted/20 p-4">
        <p className="font-semibold">Trường chính hiện hữu</p>
        <p className="mt-1 text-sm">{profile.target?.name??profile.name}</p>
        <p className="text-xs text-muted-foreground">Chỉ chỉnh sửa các phân hiệu đang đề xuất; không thay đổi trường chính.</p>
      </section>:mainIndex>=0?<section className="space-y-3 rounded-xl border bg-muted/20 p-4">
        <h3 className="font-semibold">Trường chính</h3>
        <SchoolUnitFields unit={units[mainIndex]} index={mainIndex} onFieldChange={change} errors={errors} prefix="admin-proposal-main"/>
      </section>:null}
      {!isLegacy && <SchoolBranchList units={units} expanded={expanded} onExpandedChange={setExpanded}
        onAdd={addBranch} onRemove={removeBranch} onFieldChange={change}
        errors={errors} prefix="admin-proposal-branch"/>}
      <label className="block text-sm font-medium" htmlFor="admin-proposal-profile-reason">
        Lý do chỉnh sửa *
        <Input id="admin-proposal-profile-reason" value={reason} className="mt-1" maxLength={2000}
          aria-invalid={!!errors.reason} onChange={e=>{setReason(e.target.value);setErrors(previous=>({...previous,reason:''}));}}/>
        {errors.reason&&<span className="mt-1 block text-xs text-destructive">{errors.reason}</span>}
      </label>
    </div>:<p className="text-sm text-muted-foreground">Không tải được hồ sơ. Hãy đóng và thử lại.</p>}
  </AppDialog>;
}
