'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { channelRequest } from '@/lib/channel-operations';

type RenewalCase = {
  id:number; contract_id:number; customer_name:string; contract_code:string;
  owner_name:string; status:string; source:string; note:string|null;
  previous_protection_until:string; priority_until:string;
  decision_reason:string|null; reviewed_at:string|null;
  new_protection_from:string|null; new_protection_until:string|null;
  can_approve:boolean;
};
type EligibleCase = {
  contract_id:number; contract_code:string; customer_name:string;
  protected_until:string; priority_until:string; renewal_confirmed:boolean;
  request_id:number|null; request_status:string|null; can_request_review:boolean;
};
type Response<T> = {data:T;can_approve?:boolean};
const labels:Record<string,string> = {
  WAITING_RENEWAL:'Chờ Kế toán xác nhận tái ký',
  PENDING_MANAGER:'Chờ Quản lý KIDSFIT duyệt',
  APPROVED:'Đã cấp chu kỳ bảo vệ mới',
  REJECTED:'Đã từ chối',
  EXPIRED:'Hết thời gian ưu tiên',
};
const date=(value:string|null)=>value?new Date(value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';

export function ProtectionRenewalPanel({apiBase,token,mode}:{apiBase:string;token:string;mode:'sales'|'manager'}) {
  const [items,setItems]=useState<RenewalCase[]>([]);
  const [eligible,setEligible]=useState<EligibleCase[]>([]);
  const [canApprove,setCanApprove]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState<number|null>(null);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const load=useCallback(async()=>{
    if(!apiBase||!token)return;
    setLoading(true);setError('');
    try {
      const rows=await channelRequest<Response<RenewalCase[]>>(apiBase,token,'/protection-renewals');
      setItems(rows.data);setCanApprove(!!rows.can_approve);
      if(mode==='sales'){
        const available=await channelRequest<Response<EligibleCase[]>>(apiBase,token,'/protection-renewals/eligible');
        setEligible(available.data);
      }
    }catch(e){setError(e instanceof Error?e.message:'Không thể tải hồ sơ bảo vệ.');}
    finally{setLoading(false);}
  },[apiBase,token,mode]);
  useEffect(()=>{void load();},[load]);
  const send=async(id:number,path:string,body?:{reason:string})=>{
    if(busy!==null)return;
    setBusy(id);setError('');setMessage('');
    try{
      await channelRequest(apiBase,token,path,{method:'POST',body:JSON.stringify(body??{})});
      setMessage('Đã cập nhật hồ sơ.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Không thể xử lý yêu cầu.');}
    finally{setBusy(null);}
  };
  const review=(item:RenewalCase,approve:boolean)=>{
    if(!approve){
      const reason=window.prompt('Nhập lý do từ chối hồ sơ (bắt buộc):');
      if(!reason?.trim())return;
      void send(item.id,`/protection-renewals/${item.id}/reject`,{reason:reason.trim()});
      return;
    }
    if(!window.confirm('Xác nhận cấp chu kỳ bảo vệ 5 năm mới? Kế toán phải xác nhận hợp đồng tái ký trước.'))return;
    void send(item.id,`/protection-renewals/${item.id}/approve`);
  };
  return <section aria-label="Gia hạn quyền bảo vệ 5 năm" className="space-y-4 rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="size-5 text-green-700"/>Gia hạn quyền bảo vệ 5 năm</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode==='sales'?'CRM tự tạo yêu cầu. Sales chỉ theo dõi hoặc đề nghị xem xét khi chưa có hồ sơ.':
            'Chỉ Quản lý bán hàng có quyền tại KIDSFIT mới được xác nhận chu kỳ mới.'}
        </p></div>
      <button type="button" disabled={loading} onClick={()=>void load()}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">
        <RefreshCw className="size-4"/>Làm mới
      </button>
    </div>
    {error&&<p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-700">{error}</p>}
    {message&&<p role="status" className="text-sm text-green-700">{message}</p>}
    {loading&&<p role="status" className="text-sm text-muted-foreground">Đang tải dữ liệu...</p>}
    {mode==='sales'&&<div className="space-y-3">
      <h4 className="font-medium">Trường sắp hết hạn hoặc trong 15 ngày ưu tiên</h4>
      {!loading&&eligible.length===0&&<p className="text-sm text-muted-foreground">Hiện chưa có trường trong khoảng đăng ký lại.</p>}
      {eligible.map(item=><article key={item.contract_id} className="rounded-lg border p-4">
        <div className="font-semibold">{item.customer_name}</div>
        <p className="mt-1 text-xs text-muted-foreground">{item.contract_code} · Hết bảo vệ: {date(item.protected_until)} · Hết ưu tiên: {date(item.priority_until)}</p>
        <p className="mt-2 text-sm">Tái ký: <strong>{item.renewal_confirmed?'Kế toán đã xác nhận':'Chưa có kỳ tái ký được xác nhận'}</strong></p>
        <p className="text-sm">Hồ sơ: {item.request_status?labels[item.request_status]??item.request_status:'Chưa tạo hồ sơ'}</p>
        {item.can_request_review&&<button type="button" disabled={busy!==null}
          className="mt-3 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          onClick={()=>{
            const reason=window.prompt('Lý do cần Quản lý KIDSFIT xem xét (có thể để trống):');
            if(reason===null)return;
            void send(item.contract_id,`/contracts/${item.contract_id}/protection-renewal/request-review`,{reason});
          }}>Yêu cầu xem xét</button>}
      </article>)}
    </div>}
    <div className="space-y-3">
      <h4 className="font-medium">{mode==='manager'?'Hàng đợi hồ sơ bảo vệ':'Lịch sử yêu cầu bảo vệ'}</h4>
      {!loading&&items.length===0&&<p className="text-sm text-muted-foreground">Chưa có hồ sơ phù hợp.</p>}
      {items.map(item=><article key={item.id} className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{item.customer_name}</strong>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{labels[item.status]??item.status}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{item.contract_code} · Sales: {item.owner_name}</p>
        <p className="mt-2 text-sm">Bảo vệ cũ: {date(item.previous_protection_until)} · Ưu tiên đến: {date(item.priority_until)}</p>
        {item.new_protection_until&&<p className="text-sm text-green-700">Bảo vệ mới đến: {date(item.new_protection_until)}</p>}
        {item.decision_reason&&<p className="text-sm text-red-700">Lý do: {item.decision_reason}</p>}
        {mode==='manager'&&canApprove&&item.can_approve&&<div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy!==null}
            className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={()=>review(item,true)}>Xác nhận 5 năm mới</button>
          <button type="button" disabled={busy!==null}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            onClick={()=>review(item,false)}>Từ chối</button>
        </div>}
      </article>)}
    </div>
  </section>;
}
