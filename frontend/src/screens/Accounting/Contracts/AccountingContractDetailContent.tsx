'use client';

import {Building2, ChevronDown, FileCheck2, FileText, UserRound} from 'lucide-react';
import {AppStatusBadge} from '@/components/common/app-status-badge';
import {channelDate,channelMoney} from '@/lib/channel-operations';
import {getServicePlanLabel} from '@/lib/contract-payment-plan';
import {AccountingRenewalInline} from './AccountingRenewalInline';
import type {ContractRow, Detail} from './AccountingContractsPage';

type HistoryItem={status:string;gap_start_on:string;threshold_on:string;processed_at:string;reason:string};
type RenewalAction='view'|'confirm'|'request-info';
type Props={
  detail:Detail;
  sourceRow:ContractRow|undefined;
  contractId:number;
  selectedPeriodId:number|null;
  focusedRenewal:{id:number;action:RenewalAction}|null;
  giHistory:HistoryItem[];
  apiBase:string;token:string;abilities:string[];
  onChanged:()=>Promise<void>;
};
function serviceStatus(start:string|null|undefined,end:string|null|undefined,contractStatus:string){
  if(contractStatus==='CANCELLED')return 'Đã hủy hợp đồng';
  if(!start||!end)return 'Chưa cập nhật';
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(today<start)return 'Chưa bắt đầu';
  if(today>end)return 'Đã hết hạn';
  const warning=new Date(today+'T00:00:00Z');warning.setUTCDate(warning.getUTCDate()+30);
  return end<=warning.toISOString().slice(0,10)?'Sắp hết hạn':'Còn hiệu lực';
}
function Field({label,value}:{label:string;value:string|number}){
  return <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-1 break-words font-medium leading-6">{value}</dd>
  </div>;
}
function InfoCard({title,icon:Icon,children}:{
  title:string;icon:typeof FileText;children:React.ReactNode;
}){
  return <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
    <h3 className="flex items-center gap-2 font-bold text-foreground">
      <Icon className="size-4 text-primary" aria-hidden="true"/>{title}
    </h3>
    {children}
  </section>;
}
export function AccountingContractDetailContent({detail,sourceRow,contractId,selectedPeriodId,focusedRenewal,giHistory,apiBase,token,abilities,onChanged}:Props){
  const renewal=sourceRow?.periods?.find(period=>period.id===selectedPeriodId);
  const kind=selectedPeriodId===null?'Hợp đồng lần đầu':'Tái ký lần '+(renewal?.renewal_no??'?');
  const code=selectedPeriodId===null?detail.data.contract_code:renewal?.contract_code??'Chưa có mã hợp đồng tái ký';
  const signed=selectedPeriodId===null?detail.data.signed_on:renewal?.signed_on;
  const start=selectedPeriodId===null?detail.data.source_service_start_on:renewal?.service_start_on;
  const end=selectedPeriodId===null?detail.data.source_service_end_on:renewal?.service_end_on;
  const value=selectedPeriodId===null?detail.data.total_value:renewal?.total_value;
  const cycle=selectedPeriodId===null?detail.data.source_payment_cycle:renewal?.payment_cycle;
  const state=selectedPeriodId===null?detail.data.status:renewal?.status??'UNKNOWN';
  const statusLabel=selectedPeriodId!==null
    ?({PENDING_ACCOUNTING:'Chờ Kế toán xác nhận',NEEDS_INFO:'Cần Sales bổ sung',CONFIRMED:'Đã xác nhận',REJECTED:'Đã từ chối',DRAFT:'Nháp'} as Record<string,string>)[state]??'Cần rà soát'
    :state==='ACTIVE'?'Hợp đồng hợp lệ':state==='CANCELLED'?'Đã hủy':state;
  return <div className="space-y-4 text-sm">
    <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileCheck2 className="size-6" aria-hidden="true"/>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-bold text-foreground">{detail.data.school_name}</h2>
          <p className="mt-1 break-all text-xs text-muted-foreground">{code}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium">{kind}</span>
            <AppStatusBadge status={state} label={statusLabel} size="sm"
              tone={state==='PENDING_ACCOUNTING'||state==='NEEDS_INFO'?'warning':state==='REJECTED'||state==='CANCELLED'?'danger':state==='ACTIVE'||state==='CONFIRMED'?'success':'neutral'}/>
          </div>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 border-t border-border/70 pt-4 sm:grid-cols-2">
        <Field label="Kỳ sử dụng" value={start&&end?channelDate(start)+' – '+channelDate(end):'Chưa cập nhật'}/>
        <Field label="Giá trị hợp đồng" value={value===undefined?'Chưa cập nhật':channelMoney(value)}/>
      </dl>
    </section>
    <InfoCard title="Thông tin hợp đồng" icon={FileText}>
      <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Mã hợp đồng" value={code}/>
        <Field label="Loại hợp đồng" value={kind}/>
        <Field label="Ngày ký" value={signed?channelDate(signed):'Chưa cập nhật'}/>
        <Field label="Trạng thái sử dụng" value={selectedPeriodId!==null&&state!=='CONFIRMED'?statusLabel:serviceStatus(start,end,detail.data.status)}/>
        <Field label="Ngày bắt đầu" value={start?channelDate(start):'Chưa cập nhật'}/>
        <Field label="Ngày kết thúc" value={end?channelDate(end):'Chưa cập nhật'}/>
        <Field label="Gói dịch vụ" value={getServicePlanLabel(detail.data.service_plan)}/>
        <Field label="Chu kỳ thanh toán" value={cycle==='MONTHLY'?'Theo tháng':cycle==='YEARLY'?'Theo năm':'Chưa cập nhật'}/>
      </dl>
    </InfoCard>
    <InfoCard title="Thông tin nhà trường" icon={Building2}>
      <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Tên nhà trường" value={detail.data.school_name}/>
        <Field label="Số học sinh" value={detail.data.student_count??'Chưa cập nhật'}/>
        <div className="sm:col-span-2">
          <Field label="Địa chỉ" value={[detail.data.school_address,detail.data.school_district,detail.data.school_province].filter(Boolean).join(', ')||'Chưa cập nhật'}/>
        </div>
      </dl>
      <details className="group rounded-xl border border-border/80">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 font-medium focus-visible:outline-2 focus-visible:outline-ring">
          <span>Trường điểm / Phân hiệu ({detail.school_units.length})</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true"/>
        </summary>
        <div className="border-t border-border/70 px-3 py-3">
          {detail.school_units.length>0?<ul className="space-y-2">{detail.school_units.map(unit=><li key={unit.id} className="break-words">{unit.name}</li>)}</ul>
            :<p className="text-xs text-muted-foreground">Chỉ có trường chính, không có trường điểm / phân hiệu.</p>}
        </div>
      </details>
    </InfoCard>
    <InfoCard title="Sales phụ trách & xử lý hồ sơ" icon={UserRound}>
      <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field label="Sales phụ trách" value={detail.data.owner_name}/>
        <Field label="Vai trò" value={detail.data.personnel_type==='COLLABORATOR'?'CTV':'Nhân viên'}/>
        <Field label="CHECKEE xác minh" value={detail.data.verified_at?channelDate(detail.data.verified_at):'Chưa xác minh'}/>
        <Field label="Quyền bảo vệ Sales" value={detail.data.protection_until?'Đến '+channelDate(detail.data.protection_until):'Không có quyền bảo vệ đang hiệu lực'}/>
      </dl>
      {sourceRow&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-3">
        <span className="text-xs font-medium">Tình trạng dịch vụ và quyền bảo vệ toàn nhà trường</span>
        <AppStatusBadge variant="kidsfit-service" status={sourceRow.service_status} label={{
          CONTINUOUS:'Đang sử dụng',EXPIRING_SOON:'Sắp hết hạn',INTERRUPTED:'Gián đoạn',
          THRESHOLD_REACHED:'Đủ 12 tháng',THRESHOLD_OVERDUE:'Quá 12 tháng',
          RELEASED:'Đã hết bảo vệ',NEEDS_REVIEW:'Cần rà soát',HISTORICAL_GAP:'Cần rà soát',
          MISSING_TERM:'Cần rà soát',INACTIVE:'Đã kết thúc'
        }[sourceRow.service_status]??'Cần kiểm tra'}/>
      </div>}
      {giHistory.length>0&&<details className="group rounded-xl border border-border/80">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-xs font-semibold">
          <span>Lịch sử xử lý gián đoạn (GI-01)</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true"/>
        </summary>
        <div className="space-y-3 border-t border-border/70 px-3 py-3">{giHistory.map((item,i)=>
          <div key={i} className="border-l-2 border-border pl-3 text-xs">
            <p className="font-medium">{item.status==='RELEASED'?'Đã giải phóng quyền':item.status==='REVIEW_REQUIRED'?'Chờ rà soát':item.status}</p>
            <p className="mt-1 text-muted-foreground">{channelDate(item.processed_at)} · {item.reason||'Không có ghi chú'}</p>
          </div>)}
        </div>
      </details>}
    </InfoCard>
    <AccountingRenewalInline key={contractId+':'+(selectedPeriodId??'original')+':'+(focusedRenewal?.action??'view')}
      apiBase={apiBase} token={token} contractId={contractId} abilities={abilities}
      focusRenewalId={selectedPeriodId} focusAction={focusedRenewal?.action}
      onChanged={onChanged}/>
  </div>;
}
