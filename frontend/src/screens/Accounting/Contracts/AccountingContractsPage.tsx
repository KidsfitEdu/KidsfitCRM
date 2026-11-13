'use client';

import { getServicePlanLabel } from '@/lib/contract-payment-plan';
import { accountingTransactionTimestamp, contractSignedDay, validateTransactionDay } from '@/lib/accounting-transaction-date';
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardCheck, ExternalLink, Eye, FileText, Image as ImageIcon, MapPin, MessageSquareText, Pencil, Plus, RotateCcw, Search, Send, UserRound, UsersRound, WalletCards } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppPagination } from '@/components/common/app-pagination';
import { AppSelect } from '@/components/common/app-select';
import { AdminIconAction } from '@/components/common/admin-list-ui';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { AppButton } from '@/components/common/buttons/app-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppCurrencyInput } from '@/components/common/inputs/app-currency-input';
import { channelDate, channelMoney, channelRequest, ChannelRequestError, parseMoneyInput, type FinanceWorkspace } from '@/lib/channel-operations';
import { EvidencePreviewDialog } from '@/components/common/evidence-preview-dialog';
import { AppStatusBadge } from '@/components/common/app-status-badge';
import { AppSkeleton, InlineLoading } from '@/components/common/app-loading';
import { AccountingRenewalInline } from './AccountingRenewalInline';

const paymentScheduleLabel = (status: string) => ({
  PAID: 'Đã thanh toán',
  PENDING: 'Chưa thanh toán',
  PARTIAL: 'Thanh toán một phần',
  PARTIALLY_PAID: 'Thanh toán một phần',
  OVERDUE: 'Quá hạn',
  CANCELLED: 'Đã hủy',
} as Record<string, string>)[status] ?? 'Chưa xác định';

const payoutStatusLabel = (status: string) => ({
  DRAFT: 'Nháp',
  PENDING_APPROVAL: 'Chờ BGĐ duyệt',
  CHANGES_REQUESTED: 'Cần bổ sung',
  APPROVED: 'Đã duyệt',
  PAID: 'Đã chi',
  CANCELLED: 'Đã hủy',
  REJECTED: 'Đã từ chối',
} as Record<string, string>)[status] ?? 'Chưa xác định';

// Presentation only: preserve the YYYY-MM period used by payout API and accounting ledger.
const payoutPeriodLabel = (period: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  return match ? `Tháng ${match[2]}/${match[1]}` : period;
};

const accountingBusinessDay = (date: Date) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

type FieldErrors = Partial<Record<'transaction_date' | 'amount' | 'reference_code' | 'proof' | 'schedule_id' | 'payout_id', string>>;

type ServicePeriod = { start_on:string; end_on:string; payment_cycle:string;
  renewal_id:number|null; renewal_no:number|null; gap_reason:string|null };
type ContractRow = {
  current_period:ServicePeriod|null;
  next_confirmed_period:ServicePeriod|null;
  latest_confirmed_period:ServicePeriod|null;
  id: number;
  contract_code: string;
  school_name: string;
  owner_name: string;
  owner_user_id: number;
  verified_at: string | null;
  personnel_type: string | null;
  total_value: number;
  received: number;
  refunded: number;
  commission: number;
  contract_status: string;
  service_start_on: string | null;
  service_end_on: string | null;
  payment_cycle: string | null;
  customer_id:number;
  service_until:string|null;
  next_service_start_on:string|null;
  service_status:string;
  gap_start_on:string|null;
  threshold_on:string|null;
  action:string|null;
  pending_renewal_id:number|null;
  has_financial_history:boolean;
};
type ContractList = { data: ContractRow[]; owners?: { id: number; name: string }[] | null; total: number; page: number; page_size: number };
type BackfillPreview={
  receipt_id:number;contract_id:number;eligible_cash:number;
  sales_user_id:number;manager_user_id:number|null;manager_name:string|null;
  manager_review_required:boolean;requires_manager_verification:boolean;
  sales_percent:number;manager_percent:number;
  sales_amount:number;manager_amount:number;
  policy_source:string;board_policy_version_id:number|null;
  has_existing_ledger:boolean;can_apply:boolean;
};
type Detail = {
  current_period:ServicePeriod|null;
  next_confirmed_period:ServicePeriod|null;
  latest_confirmed_period:ServicePeriod|null;
  previous_period:ServicePeriod|null;
  period_history:ServicePeriod[];
  data: { id: number; contract_code: string; school_name: string; school_address: string | null; school_district: string | null; school_province: string | null; owner_name: string; personnel_type: string | null;
    signed_on: string; effective_on: string | null; status: string; verified_at: string | null; total_value: number; evidence_reference: string | null; owner_organization_id: number; owner_user_id: number; service_plan:string|null;student_count:number|null;
    source_service_start_on:string|null;source_service_end_on:string|null;source_payment_cycle:string|null;
    service_start_on:string|null;service_end_on:string|null;payment_cycle:string|null;
    protection_until:string|null };
  schedules: { id: number; due_on: string; amount_due: number; amount_received: number; status: string }[];
  refunded_total: number;
  receipts: { id: number; received_at: string; amount: number; reference_code: string; payment_method: string }[];
  ledger: { id: number; entry_type: string; amount: number; rate_percent: number; calculation_base:number;
    reason: string | null; occurred_at: string;
    period: string; beneficiary_user_id: number; beneficiary_name: string; beneficiary_organization_id: number;
    revenue_receipt_id:number|null;
    beneficiary_role: 'SALES'|'MANAGER'; policy_source: string; board_policy_version_id: number|null;
    assigned_to_payout: boolean }[];
  payouts: { id: number; code: string; net_amount: number; status: string; paid_at: string | null; payment_reference: string | null;
    beneficiary_role:'SALES'|'MANAGER'; beneficiary_user_id:number;
    suggested_rate_percent:number; requested_rate_percent:number;
    suggested_amount:number; requested_amount:number;
    withholding_amount:number; withholding_reason:string|null; period:string;
    adjustment_reason:string|null; events:{event_type:string;reason:string|null;created_at:string}[] }[];
  evidence: {id:number;kind:string;file_name:string;revenue_receipt_id:number|null;payout_id:number|null}[];
  school_units: {id:number;name:string}[];
};

export function AccountingContractsPage({ apiBase, token, abilities, onChanged }: {
  apiBase: string; token: string; abilities: string[]; onChanged: () => Promise<void>;
  financialView?: 'CURRENT' | 'HISTORY';
}) {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('ALL');
  const [workspaceStatus, setWorkspaceStatus] = useState('ALL');
  const [owners, setOwners] = useState<{ id: number; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [accountingTab,setAccountingTab]=useState<'CONTRACTS'|'PAYOUTS'>('CONTRACTS');
  const [financePeriod,setFinancePeriod]=useState(()=>new Intl.DateTimeFormat('sv-SE',{
    timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'
  }).format(new Date()));
  const [financeStatus,setFinanceStatus]=useState('ALL');
  const [financeOrganization,setFinanceOrganization]=useState('ALL');
  const [financeSearch,setFinanceSearch]=useState('');
  const [financeRole,setFinanceRole]=useState('ALL');
  const [financeOverview,setFinanceOverview]=useState<FinanceWorkspace|null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [giHistory,setGiHistory]=useState<{status:string;gap_start_on:string;threshold_on:string;processed_at:string;reason:string}[]>([]);
  const [detailRevision, setDetailRevision] = useState(0);
  const [payoutPeriod, setPayoutPeriod] = useState('');
  const [payoutBeneficiary, setPayoutBeneficiary] = useState('');
  const [payoutDialogOpen,setPayoutDialogOpen] = useState(false);
  const [editingPayout,setEditingPayout]=useState<Detail['payouts'][number]|null>(null);
  const [payoutRate,setPayoutRate]=useState('0');
  const [payoutRequestedAmount,setPayoutRequestedAmount]=useState('0');
  const [payoutAdjustmentReason,setPayoutAdjustmentReason]=useState('');
  const [returningPayoutId,setReturningPayoutId]=useState<number|null>(null);
  const [payoutReturnReason,setPayoutReturnReason]=useState('');
  const [backfillPreview,setBackfillPreview]=useState<BackfillPreview|null>(null);
  const [backfillReason,setBackfillReason]=useState('');
  const [backfillManagerVerified,setBackfillManagerVerified]=useState(false);
  const [backfillBusy,setBackfillBusy]=useState(false);
  const [payoutWithholding,setPayoutWithholding] = useState('0');
  const [payoutWithholdingReason,setPayoutWithholdingReason] = useState('');
  const [payoutError,setPayoutError] = useState('');
  const payoutKey = useRef<string|null>(null);
  const [selectedScheduleId,setSelectedScheduleId] = useState<number|null>(null);
  const [selectedPayoutId,setSelectedPayoutId] = useState<number|null>(null);
  const receiptAttempt = useRef<{signature:string; key:string; timestamp:string; evidenceId:number|null}|null>(null);
  const [entryMode, setEntryMode] = useState<'receipt' | 'payout' | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [preview, setPreview] = useState<{url:string; name:string; mime:string}|null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const canView = abilities.includes('channel_sales.commission.view') || abilities.includes('*');
  const connected = Boolean(apiBase && token && canView);
  const load = useCallback(async () => {
    if (!connected) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), status:workspaceStatus });
      if (ownerUserId !== 'ALL') params.set('owner_user_id', ownerUserId);
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
      const result = await channelRequest<ContractList>(apiBase, token, `/accounting/workspace?${params.toString()}`);
      setRows(result.data);
      // During staged deployments the previous API may not include owner options yet.
      setOwners(Array.isArray(result.owners) ? result.owners : []);
      setTotal(result.total);
    } catch (cause) {
      // Preserve the current rows on transient failures so the list does not flash empty.
      appNotice.error('Không tải được danh sách hợp đồng.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }, [apiBase, token, page, pageSize, appliedSearch, ownerUserId, workspaceStatus, connected]);
  useEffect(() => { void load(); }, [load]);
  useEffect(()=>{
    if(!connected||accountingTab!=='PAYOUTS')return;
    let active=true;
    void channelRequest<FinanceWorkspace>(apiBase,token,
      `/finance?period=${encodeURIComponent(financePeriod)}`)
      .then(value=>{if(active)setFinanceOverview(value);})
      .catch(cause=>{if(active)appNotice.error('Không tải được danh sách phiếu chi.',
        cause instanceof Error?cause.message:'Vui lòng thử lại.');});
    return()=>{active=false;};
  },[apiBase,token,connected,accountingTab,financePeriod,detailRevision]);

  useEffect(() => {
    if (!connected || selected === null) { setDetail(null); return; }
    let live = true;
    setDetail(null);
    void channelRequest<Detail>(apiBase, token, `/accounting/contracts/${selected}`)
      .then(value => { if (live) setDetail(value); })
      .catch(cause => { if (live) appNotice.error('Không tải được chi tiết hợp đồng.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'); });
    return () => { live = false; };
  }, [apiBase, token, selected, connected, detailRevision]);

  useEffect(()=>{
    if(!connected||selected===null){setGiHistory([]);return;}
    let active=true;setGiHistory([]);
    void channelRequest<{data:typeof giHistory}>(apiBase,token,
      '/accounting/contracts/'+selected+'/service-history')
      .then(res=>{if(active)setGiHistory(res.data);})
      .catch(()=>{if(active)setGiHistory([]);});
    return ()=>{active=false;};
  },[apiBase,token,selected,connected]);

  const serviceStatus = (start:string|null,end:string|null,contractStatus:string) => {
    if (contractStatus === 'CANCELLED') return 'Đã hủy hợp đồng';
    if (!start || !end) return 'Chưa cập nhật';
    const today = accountingBusinessDay(new Date());
    if (today < start) return 'Chưa bắt đầu';
    if (today > end) return 'Đã hết hạn';
    const warning = new Date(today + 'T00:00:00Z');
    warning.setUTCDate(warning.getUTCDate()+30);
    return end <= warning.toISOString().slice(0,10)?'Sắp hết hạn':'Còn hiệu lực';
  };

  const viewEvidence = async (id: number, name: string, inNewTab = false) => {
    // Open synchronously on click to avoid popup blockers, then load authenticated bytes.
    const tab = inNewTab ? window.open('', '_blank') : null;
    if (inNewTab && tab) tab.document.title = 'Đang mở hợp đồng...';
    try {
      const response = await fetch(`${apiBase}/channel-sales/evidence/${id}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      if (!response.ok) throw new Error('Không có quyền xem chứng từ hoặc tệp không còn tồn tại.');
      const original = await response.blob();
      const ext = name.toLowerCase().split('.').pop();
      const mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const url = URL.createObjectURL(new Blob([original], {type: mime}));
      if (inNewTab) {
        if (!tab) { URL.revokeObjectURL(url); throw new Error('Trình duyệt đang chặn tab mới. Vui lòng cho phép mở cửa sổ.'); }
        tab.location.replace(url);
        // Blob URLs live for the tab session; revoke on the main window's unload.
        window.addEventListener('pagehide', () => URL.revokeObjectURL(url), {once:true});
      } else {
        setPreview(old => { if (old) URL.revokeObjectURL(old.url); return {url, name, mime}; });
      }
    } catch (cause) {
      if (tab) tab.close();
      appNotice.error('Không mở được chứng từ.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    }
  };
  const closePreview = () => {
    setPreview(old => { if (old) URL.revokeObjectURL(old.url); return null; });
  };
  const submitSearch = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  const canRecordRevenue = abilities.includes('channel_sales.revenue.record') || abilities.includes('*');
  const canCompletePayout = abilities.includes('channel_sales.payout.complete') || abilities.includes('*');
  const canCreatePayout = abilities.includes('channel_sales.payout.create') || abilities.includes('*');
  const canAdjustCommission=abilities.includes('channel_sales.commission.adjust')||abilities.includes('*');
  const canApprovePayout = abilities.includes('channel_sales.payout.approve') || abilities.includes('*');
  const openReceipt = () => {
    setFieldErrors({});setAmountInput('');
    const next = detail?.schedules.find(x=>x.amount_received<x.amount_due);
    setSelectedScheduleId(next?.id??null);
    setSelectedPayoutId(null);receiptAttempt.current=null;setEntryMode('receipt');
  };
  const openPayoutPayment = (payoutId?:number) => {
    const next = detail?.payouts.find(x=>x.id===payoutId&&x.status==='APPROVED')
      ?? detail?.payouts.find(x=>x.status==='APPROVED');
    if(!next)return;
    setFieldErrors({});
    setSelectedPayoutId(next.id);setSelectedScheduleId(null);
    setAmountInput(String(next.net_amount));receiptAttempt.current=null;setEntryMode('payout');
  };
  const sendRecord = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selected === null || !detail || !entryMode) return;
    const form = new FormData(event.currentTarget);
    const proof = form.get('proof');
    const dateValue = form.get('transaction_date');
    const date = typeof dateValue === 'string' ? dateValue : '';
    const amount = parseMoneyInput(amountInput);
    const referenceValue = form.get('reference_code');
    const reference = typeof referenceValue === 'string' ? referenceValue.trim() : '';
    const today = accountingBusinessDay(new Date());
    const signedOn = contractSignedDay(detail.data.signed_on);
    const validation: FieldErrors = {};
    if(entryMode==='receipt'&&!signedOn){
      validation.transaction_date='Không xác định được ngày ký hợp đồng. Vui lòng tải lại chi tiết.';
    }else{
      const dateError=validateTransactionDay(date,today,signedOn??today,entryMode);
      if(dateError)validation.transaction_date=dateError;
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) validation.amount = 'Số tiền phải là số nguyên dương.';
    if (!reference) validation.reference_code = 'Vui lòng nhập mã giao dịch ngân hàng.';
    if (!(proof instanceof File) || proof.size === 0) validation.proof = 'Vui lòng chọn ảnh chứng từ chuyển khoản.';
    else if (proof.size > 5 * 1024 * 1024) validation.proof = 'Ảnh chứng từ không được vượt quá 5 MB.';
    else if (!['image/jpeg', 'image/png', 'image/webp'].includes(proof.type))
      validation.proof = 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.';
    const scheduleId = selectedScheduleId;
    const payoutId = selectedPayoutId;
    const schedule = detail.schedules.find(x=>x.id===scheduleId);
    const payout = detail.payouts.find(x=>x.id===payoutId&&x.status==='APPROVED');
    if (entryMode === 'receipt' && !schedule) validation.schedule_id = 'Vui lòng chọn đợt thanh toán.';
    if (entryMode === 'receipt' && schedule && amount>schedule.amount_due-schedule.amount_received)
      validation.amount = 'Số tiền vượt số tiền còn phải thu của đợt đã chọn.';
    if (entryMode === 'payout' && !payout) validation.payout_id = 'Vui lòng chọn phiếu chi đã duyệt.';
    if (entryMode === 'payout' && payout && amount!==payout.net_amount)
      validation.amount = 'Số tiền phải khớp với phiếu chi đã duyệt.';
    if (Object.keys(validation).length) { setFieldErrors(validation); return; }
    if (!(proof instanceof File)) return;
    setFieldErrors({});
    setSaving(true);
    let attemptedEvidenceId:number|null=null;
    try {
      // Use the calendar date rather than a moving current timestamp as the
      // retry signature; otherwise every retry generates a new idempotency key.
      const signature = JSON.stringify({
        entryMode,selected,scheduleId,payoutId,date,amount,reference:reference.toUpperCase(),
        proof:[proof.name,proof.size,proof.lastModified],
      });
      if(receiptAttempt.current?.signature!==signature){
        receiptAttempt.current={
          signature,key:crypto.randomUUID(),timestamp:accountingTransactionTimestamp(date),
          evidenceId:null,
        };
      }
      const attempt=receiptAttempt.current;
      const timestamp=attempt.timestamp;
      if(attempt.evidenceId===null){
        const attachment=new FormData();
        attachment.set('kind',entryMode==='receipt'?'RECEIPT':'PAYOUT');
        attachment.set('file',proof);
        if(entryMode==='receipt')attachment.set('contract_id',String(selected));
        else attachment.set('payout_id',String(payoutId));
        const uploaded=await channelRequest<{data:{id:number}}>(apiBase,token,'/evidence',{
          method:'POST',body:attachment
        });
        attempt.evidenceId=uploaded.data.id;
      }
      attemptedEvidenceId=attempt.evidenceId;
      if(entryMode==='receipt'){
        await channelRequest(apiBase,token,`/contracts/${selected}/revenue-receipts`,{
          method:'POST',body:JSON.stringify({
            idempotency_key:attempt.key,revenue_schedule_id:scheduleId,
            received_at:timestamp,amount,reference_code:reference,
            payment_method:'BANK_TRANSFER',evidence_id:attempt.evidenceId,
          }),
        });
      }else{
        await channelRequest(apiBase,token,`/payouts/${payoutId}/complete`,{
          method:'POST',body:JSON.stringify({
            paid_at:timestamp,payment_reference:reference,
            evidence_id:attempt.evidenceId,amount,
          }),
        });
      }
      receiptAttempt.current=null;
      setEntryMode(null);
      setDetailRevision(v=>v+1);
      appNotice.success(entryMode==='receipt'?'Đã ghi nhận khoản thu.':'Đã ghi nhận khoản chi hoa hồng.');
      await load();
    }catch(cause){
      if(cause instanceof ChannelRequestError && cause.status===422 && Object.keys(cause.errors).length){
        const next:FieldErrors={};
        for(const [key,messages] of Object.entries(cause.errors)){
          if(key in {transaction_date:true,received_at:true,paid_at:true,amount:true,
            reference_code:true,proof:true,schedule_id:true,revenue_schedule_id:true,payout_id:true}){
            const target=key==='received_at'||key==='paid_at'?'transaction_date'
              :key==='revenue_schedule_id'?'schedule_id':key as keyof FieldErrors;
            next[target]=messages[0];
          }
        }
        if(Object.keys(next).length)setFieldErrors(next);
        else appNotice.error('Không thể lưu giao dịch.',cause.message);
      }else{
        appNotice.error('Không thể lưu giao dịch.',cause instanceof Error?cause.message:'Vui lòng thử lại.');
      }
      // A confirmed validation/conflict response means no new financial record was
      // committed. Clean only a still-unattached proof owned by the actor.
      // Never discard on a timeout/unknown 5xx: the operation may have succeeded.
      if(attemptedEvidenceId!==null && cause instanceof ChannelRequestError &&
        [400,404,409,422].includes(cause.status)){
        try{
          await channelRequest(apiBase,token,`/evidence/${attemptedEvidenceId}`,{method:'DELETE'});
          receiptAttempt.current=null;
        }catch{
          // A concurrent successful write may already have attached the proof.
        }
      }
    } finally {
      setSaving(false);
    }
  };
  const pendingBackfillReceipts=detail
    ? detail.receipts.filter(receipt=>!detail.ledger.some(entry=>entry.revenue_receipt_id===receipt.id))
    : [];
  const eligibleEntries=(detail?.ledger??[]).filter(entry=>!entry.assigned_to_payout);
  const beneficiaryEntries=Array.from(new Map(eligibleEntries.map(entry=>[
    `${entry.beneficiary_role}:${entry.beneficiary_user_id}`,
    {key:`${entry.beneficiary_role}:${entry.beneficiary_user_id}`,
      id:entry.beneficiary_user_id,role:entry.beneficiary_role,name:entry.beneficiary_name},
  ])).values());
  const beneficiaries=beneficiaryEntries.filter(beneficiary=>
    eligibleEntries.some(entry=>entry.beneficiary_user_id===beneficiary.id
      &&entry.beneficiary_role===beneficiary.role)
    &&eligibleEntries.filter(entry=>entry.beneficiary_user_id===beneficiary.id
      &&entry.beneficiary_role===beneficiary.role).reduce((sum,entry)=>sum+entry.amount,0)>0);
  const currentBeneficiary=beneficiaries.find(x=>x.key===payoutBeneficiary)??beneficiaries[0];
  const eligibleByPeriod=new Map<string,number>();
  for(const entry of eligibleEntries){
    if(entry.beneficiary_user_id===currentBeneficiary?.id
      &&entry.beneficiary_role===currentBeneficiary?.role){
      eligibleByPeriod.set(entry.period,(eligibleByPeriod.get(entry.period)??0)+entry.amount);
    }
  }
  const eligiblePeriods=[...eligibleByPeriod.entries()]
    .filter(([,amount])=>amount>0).map(([period])=>period).sort().reverse();
  const chosenPeriod=eligiblePeriods.includes(payoutPeriod)?payoutPeriod:(eligiblePeriods[0]??'');
  const eligibleForSelection=eligibleEntries.filter(entry=>entry.period===chosenPeriod
    &&entry.beneficiary_role===currentBeneficiary?.role
    &&entry.beneficiary_user_id===currentBeneficiary?.id);
  const suggestedBase=eligibleForSelection.filter(x=>x.entry_type==='ACCRUAL')
    .reduce((sum,entry)=>sum+entry.calculation_base,0);
  const suggestedRate=suggestedBase>0?Number((((eligibleByPeriod.get(chosenPeriod)??0)/suggestedBase)*100).toFixed(4)):0;
  const openDraft = (payout?:Detail['payouts'][number]) => {
    setEditingPayout(payout??null);setPayoutError('');
    setPayoutRate(String(payout?.requested_rate_percent??suggestedRate));
    setPayoutRequestedAmount(String(payout?.requested_amount??(eligibleByPeriod.get(chosenPeriod)??0)));
    setPayoutAdjustmentReason(payout?.adjustment_reason??'');
    setPayoutWithholding(String(payout?.withholding_amount??0));
    setPayoutWithholdingReason(payout?.withholding_reason??'');
    payoutKey.current=null;setPayoutDialogOpen(true);
  };
  const openBackfill = async (receiptId:number) => {
    setBackfillBusy(true);
    try {
      const result=await channelRequest<{data:BackfillPreview}>(apiBase,token,
        `/revenue-receipts/${receiptId}/commission-backfill-preview`);
      setBackfillPreview(result.data);
      setBackfillReason('');
      setBackfillManagerVerified(false);
    }catch(cause){
      appNotice.error('Không thể xem đối soát hoa hồng.',
        cause instanceof Error?cause.message:'Vui lòng thử lại.');
    }finally{setBackfillBusy(false);}
  };
  const confirmBackfill = async () => {
    if(!backfillPreview||!backfillPreview.can_apply||!backfillReason.trim())return;
    setBackfillBusy(true);
    try{
      await channelRequest(apiBase,token,
        `/revenue-receipts/${backfillPreview.receipt_id}/commission-backfill`,{
          method:'POST',body:JSON.stringify({
            confirm:true,reason:backfillReason.trim(),
            manager_verified:backfillManagerVerified
          })
        });
      setBackfillPreview(null);setDetailRevision(v=>v+1);
      appNotice.success('Đã tạo bút toán hoa hồng sau đối soát khoản thu.');
      await load();
    }catch(cause){
      appNotice.error('Không thể đối soát khoản thu.',
        cause instanceof Error?cause.message:'Vui lòng thử lại.');
    }finally{setBackfillBusy(false);}
  };
  const createPayout = async () => {
    if(!detail||(!editingPayout&&(!chosenPeriod||!currentBeneficiary)))return;
    const rate=Number(payoutRate),amount=parseMoneyInput(payoutRequestedAmount),
      withholding=parseMoneyInput(payoutWithholding);
    if(!Number.isFinite(rate)||rate<0||rate>100||Math.round(rate*10000)!==rate*10000
      ||!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(withholding)
      ||withholding<0||withholding>=amount){
      setPayoutError('Kiểm tra lại % hoa hồng, số tiền đề nghị và khấu trừ.');return;
    }
    if(withholding>0&&!payoutWithholdingReason.trim()){
      setPayoutError('Vui lòng nhập lý do khấu trừ.');return;
    }
    setSaving(true);setPayoutError('');
    try{
      if(editingPayout){
        await channelRequest(apiBase,token,`/payouts/${editingPayout.id}/draft`,{
          method:'PATCH',body:JSON.stringify({
            requested_rate_percent:rate,requested_amount:amount,
            adjustment_reason:payoutAdjustmentReason.trim()||null,
            withholding_amount:withholding,
            withholding_reason:withholding>0?payoutWithholdingReason.trim():null
          })
        });
      }else{
        payoutKey.current??=crypto.randomUUID();
        await channelRequest(apiBase,token,'/payouts',{method:'POST',body:JSON.stringify({
          idempotency_key:payoutKey.current,organization_id:detail.data.owner_organization_id,
          beneficiary_user_id:currentBeneficiary?.id,beneficiary_role:currentBeneficiary?.role,
          period:chosenPeriod,contract_id:detail.data.id,withholding_amount:withholding,
          withholding_reason:withholding>0?payoutWithholdingReason.trim():null,
          requested_rate_percent:rate,requested_amount:amount,
          adjustment_reason:payoutAdjustmentReason.trim()||null
        })});
      }
      setPayoutDialogOpen(false);setEditingPayout(null);payoutKey.current=null;
      setDetailRevision(v=>v+1);
      appNotice.success('Đã lưu phiếu Nháp; cần gửi BGĐ duyệt trước khi chuyển tiền.');
      await load();
    }catch(cause){
      setPayoutError(cause instanceof Error?cause.message:'Vui lòng thử lại.');
    }finally{setSaving(false);}
  };
  const submitPayout = async (id:number) => {
    setSaving(true);
    try{
      await channelRequest(apiBase,token,`/payouts/${id}/submit`,{method:'POST'});
      setDetailRevision(v=>v+1);appNotice.success('Đã gửi BGĐ duyệt phiếu chi.');
    }catch(cause){appNotice.error('Không gửi duyệt được.',cause instanceof Error?cause.message:'Vui lòng thử lại.');}
    finally{setSaving(false);}
  };
  const returnPayout = async () => {
    if(!returningPayoutId||!payoutReturnReason.trim())return;
    setSaving(true);
    try{
      await channelRequest(apiBase,token,`/payouts/${returningPayoutId}/return`,{
        method:'POST',body:JSON.stringify({reason:payoutReturnReason.trim()})
      });
      setReturningPayoutId(null);setPayoutReturnReason('');
      setDetailRevision(v=>v+1);appNotice.success('Đã trả lại phiếu cho Kế toán bổ sung.');
    }catch(cause){appNotice.error('Không trả phiếu được.',cause instanceof Error?cause.message:'Vui lòng thử lại.');}
    finally{setSaving(false);}
  };
  const approvePayout = async (id: number) => {
    setSaving(true);
    try {
      await channelRequest(apiBase, token, `/payouts/${id}/approve`, {method:'POST'});
      setDetailRevision(v => v+1);
      appNotice.success('Đã duyệt phiếu chi.');
    } catch (cause) { appNotice.error('Không duyệt được phiếu chi.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  const resetFilters = () => {
    setSearch('');
    setAppliedSearch('');
    setOwnerUserId('ALL');
    setWorkspaceStatus('ALL');
    setPage(1);
  };
  const financeKeyword=financeSearch.trim().toLocaleLowerCase('vi-VN');
  const displayedPayouts=(financeOverview?.payouts??[])
    .filter(p=>(financeStatus==='ALL'||p.status===financeStatus)
      &&(financeRole==='ALL'||p.beneficiary_role===financeRole)
      &&(financeOrganization==='ALL'||p.organization_id===Number(financeOrganization))
      &&(!financeKeyword||[p.code,p.beneficiary_name].some(x=>x.toLocaleLowerCase('vi-VN').includes(financeKeyword))));
  const availableCommissions=(financeOverview?.ledger??[])
    .filter(entry=>entry.payout_status==='ACCRUED'
      &&(financeRole==='ALL'||entry.beneficiary_role===financeRole)
      &&(financeOrganization==='ALL'||entry.beneficiary_organization_id===Number(financeOrganization))
      &&(!financeKeyword||[entry.beneficiary_name,entry.contract_code].some(x=>x.toLocaleLowerCase('vi-VN').includes(financeKeyword))));
  return <div className="space-y-5">
    {!connected && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">Cần đăng nhập bằng tài khoản có quyền xem hoa hồng để tải dữ liệu thực tế.</p>}
    <div role="tablist" aria-label="Nghiệp vụ Kế toán" className="flex flex-wrap gap-2 border-b border-border pb-2">
      {([{key:'CONTRACTS',label:'Hợp đồng & khoản thu'},
         {key:'PAYOUTS',label:'Phiếu chi hoa hồng'}] as const).map(item=>
        <button type="button" role="tab" key={item.key}
          aria-selected={accountingTab===item.key} onClick={()=>setAccountingTab(item.key)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${accountingTab===item.key
            ?'bg-[#1b5e20] text-white':'bg-muted/40 text-muted-foreground hover:bg-muted'}`}>
          {item.label}
        </button>)}
    </div>
    {accountingTab==='CONTRACTS'&&<section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="relative min-w-[190px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <Input aria-label="Tìm hợp đồng và hoa hồng" className="h-11 w-full rounded-xl pl-10"
            placeholder="Tên trường, mã hợp đồng, người phụ trách..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <AppSelect ariaLabel="Lọc nhóm hợp đồng Kế toán" value={workspaceStatus}
          className="w-full sm:w-52" options={[
            {value:'ALL',label:'Tất cả hợp đồng'},
            {value:'PENDING',label:'Chờ xác nhận tái ký'},
            {value:'INTERRUPTED',label:'Gián đoạn dịch vụ'},
            {value:'HISTORY',label:'Lịch sử tài chính'},
          ]} onValueChange={next=>{setWorkspaceStatus(next);setPage(1);}}/>
        <AppSelect ariaLabel="Lọc theo người phụ trách" value={ownerUserId}
          className="w-full sm:w-60" options={[
            {value:'ALL',label:'Tất cả người phụ trách'},
            ...owners.map(owner=>({value:String(owner.id),label:owner.name})),
          ]} onValueChange={next=>{setOwnerUserId(next);setPage(1);}}/>
        <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
        <AppButton type="button" tone="outline" size="icon-lg" className="h-11 w-11 min-w-11 rounded-lg p-0"
          aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={resetFilters}>
          <RotateCcw className="size-4" aria-hidden="true"/>
        </AppButton>
      </form>
      {busy && rows.length > 0 && <div className="px-4 py-2"><InlineLoading label="Đang cập nhật danh sách hợp đồng..." /></div>}
      {busy && rows.length === 0 ? <output className="block space-y-3 p-5" aria-label="Đang tải danh sách hợp đồng">{Array.from({length: 6}, (_, index) => <AppSkeleton key={index} className="h-11 w-full" />)}</output> : <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="bg-[#1b5e20] text-xs font-bold uppercase tracking-[.04em] text-white">
            <tr>
              <th scope="col" className="px-4 py-3">Nhà trường</th>
              <th scope="col" className="px-3 py-3">Sales phụ trách</th>
              <th scope="col" className="px-3 py-3">Kỳ sử dụng</th>
              <th scope="col" className="px-3 py-3">Dịch vụ</th>
              <th scope="col" className="px-3 py-3">Cần xử lý</th>
              <th scope="col" className="px-3 py-3 text-right">Thanh toán</th>
              <th scope="col" className="px-3 py-3 text-right">Hoa hồng</th>
              <th scope="col" className="px-3 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {rows.map(row=>{
              const state=row.service_status;
              const label:Record<string,string>={
                CONTINUOUS:'Đang sử dụng',EXPIRING_SOON:'Sắp hết hạn',
                INTERRUPTED:'Gián đoạn',THRESHOLD_REACHED:'Đủ 12 tháng',
                THRESHOLD_OVERDUE:'Quá 12 tháng',RELEASED:'Đã hết bảo vệ',
                NEEDS_REVIEW:'Cần rà soát',INACTIVE:'Đã kết thúc',
                HISTORICAL_GAP:'Cần rà soát',MISSING_TERM:'Cần rà soát'
              };
              const amount=Math.max(0,row.received-row.refunded);
              return <tr key={row.id} className="transition-colors even:bg-muted/20 hover:bg-muted/40">
                <td className="px-4 py-4 align-middle">
                  <p className="max-w-[260px] font-semibold text-foreground">{row.school_name}</p>
                </td>
                <td className="px-3 py-4 align-middle">
                  <p className="font-medium">{row.owner_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.personnel_type==='COLLABORATOR'?'CTV':'Nhân viên'}</p>
                </td>
                <td className="px-3 py-4 align-middle tabular-nums">
                  {row.service_until?channelDate(row.service_until):'—'}
                  {row.next_service_start_on&&<p className="mt-1 text-xs text-muted-foreground">
                    Kỳ tiếp theo: {channelDate(row.next_service_start_on)}</p>}
                </td>
                <td className="px-3 py-4 align-middle">
                  <AppStatusBadge variant="kidsfit-service" status={state} label={label[state]??'Cần kiểm tra'} size="md"/>
                  {row.threshold_on&&(['INTERRUPTED','THRESHOLD_REACHED','THRESHOLD_OVERDUE','RELEASED'].includes(state))&&
                    <p className="mt-1 text-xs text-muted-foreground">
                      {state==='INTERRUPTED'?'Mốc 12 tháng':'Đạt mốc'}: {channelDate(row.threshold_on)}
                    </p>}
                </td>
                <td className="px-3 py-4 align-middle">
                  {row.action==='CONFIRM_RENEWAL'
                    ? <AppStatusBadge variant="kidsfit-action" status="CONFIRM_RENEWAL" label="Xác nhận tái ký"/>
                    :row.action==='REVIEW_PERIOD'
                      ? <AppStatusBadge variant="kidsfit-action" status="REVIEW_PERIOD" label="Kiểm tra kỳ dịch vụ"/>
                      :<span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-4 text-left align-middle tabular-nums"
                  aria-label={`Thanh toán của ${row.school_name}`}>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Giá trị hợp đồng</p>
                      <p className="mt-1 font-semibold">{channelMoney(row.total_value)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Thực thu</p>
                      <p className="mt-1 font-semibold">{channelMoney(amount)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 text-left align-middle tabular-nums">
                  <p className="text-xs text-muted-foreground">Hoa hồng ghi nhận</p>
                  <p className="mt-1 font-semibold">{channelMoney(row.commission)}</p>
                </td>
                <td className="px-3 py-4 text-center align-middle">
                  <Button type="button" size="icon" variant="outline" onClick={()=>setSelected(row.id)}
                    aria-label={`Xem chi tiết hợp đồng trường ${row.school_name}`}
                    title="Xem chi tiết hợp đồng"><Eye className="size-4"/></Button>
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      }
      {!busy && rows.length===0 && <p className="p-10 text-center text-sm text-muted-foreground">Không có hợp đồng phù hợp. Hãy thử bộ lọc khác.</p>}
      <AppPagination page={page} pageSize={pageSize} total={total} itemLabel="hợp đồng"
        disabled={busy} showSummary={false} pageSizeOptions={[20,50,100]}
        onPageChange={setPage}
        onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
    </section>}
    {accountingTab==='PAYOUTS'&&<section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Phiếu chi theo người hưởng</h2>
          <p className="mt-1 text-xs text-muted-foreground">Mỗi phiếu chỉ dành cho một Sales hoặc Quản lý. Kế toán không chỉnh tỷ lệ BGĐ tại đây.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="accounting-finance-period">Kỳ hoa hồng</label>
          <Input id="accounting-finance-period" type="month" className="w-40" value={financePeriod}
            onChange={event=>setFinancePeriod(event.target.value)}/>
          <Input aria-label="Tìm người hưởng hoặc mã phiếu chi" className="w-52"
            placeholder="Người hưởng, mã phiếu..." value={financeSearch}
            onChange={event=>setFinanceSearch(event.target.value)}/>
          <AppSelect ariaLabel="Lọc tổ chức phiếu chi" value={financeOrganization}
            options={[{value:'ALL',label:'Tất cả tổ chức'},
              ...(financeOverview?.organizations??[]).map(org=>({value:String(org.id),label:org.name}))]}
            onValueChange={setFinanceOrganization}/>
          <AppSelect ariaLabel="Lọc người hưởng hoa hồng" value={financeRole}
            options={[{value:'ALL',label:'Sales và Quản lý'},{value:'SALES',label:'Sales'},{value:'MANAGER',label:'Quản lý'}]}
            onValueChange={setFinanceRole}/>
          <AppSelect ariaLabel="Lọc trạng thái phiếu chi" value={financeStatus}
            options={[{value:'ALL',label:'Mọi trạng thái'},{value:'DRAFT',label:'Chờ duyệt'},
              {value:'APPROVED',label:'Chờ chuyển khoản'},{value:'PAID',label:'Đã chi'}]}
            onValueChange={setFinanceStatus}/>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-[#1b5e20] text-xs font-semibold uppercase text-white">
            <tr><th className="px-4 py-3">Phiếu chi</th><th className="px-3 py-3">Người hưởng</th>
              <th className="px-3 py-3">Vai trò</th><th className="px-3 py-3 text-right">Thực chi</th>
              <th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Kỳ</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayedPayouts.map(p=><tr key={p.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-medium">{p.code}</td>
              <td className="px-3 py-3">{p.beneficiary_name}</td>
              <td className="px-3 py-3">{p.beneficiary_role==='MANAGER'?'Quản lý':'Sales'}</td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums">{channelMoney(p.net_amount)}</td>
              <td className="px-3 py-3">{payoutStatusLabel(p.status)}</td>
              <td className="px-3 py-3">{p.period}</td>
            </tr>)}
            {!displayedPayouts.length&&<tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
              Không có phiếu chi phù hợp trong kỳ. Chọn kỳ khác hoặc kiểm tra khoản hoa hồng chưa lập phiếu.
            </td></tr>}
          </tbody>
        </table>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Hoa hồng chưa lập phiếu</h3>
        <p className="text-xs text-muted-foreground">Chọn hợp đồng để lập phiếu riêng theo Sales hoặc Quản lý và duyệt/chuyển tiền tại chi tiết hợp đồng.</p>
        <div className="divide-y rounded-lg border border-border">
          {availableCommissions.slice(0,30).map(entry=><div key={entry.id}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
            <div><p className="text-sm font-semibold">{entry.beneficiary_name} · {entry.beneficiary_role==='MANAGER'?'Quản lý':'Sales'}</p>
              <p className="text-xs text-muted-foreground">{entry.contract_code} · {entry.rate_percent}% · {entry.period}</p>
            </div>
            <div className="flex items-center gap-3">
              <strong className="tabular-nums">{channelMoney(entry.amount)}</strong>
              <Button type="button" size="sm" variant="outline" onClick={()=>{
                setSelected(entry.contract_id);setPayoutBeneficiary(`${entry.beneficiary_role}:${entry.beneficiary_user_id}`);
                setPayoutPeriod(entry.period);
              }}>Xem hợp đồng</Button>
            </div>
          </div>)}
          {!availableCommissions.length&&<p className="p-4 text-sm text-muted-foreground">
            Không có bút toán hoa hồng chưa phân bổ trong kỳ.
          </p>}
        </div>
      </div>
    </section>}
    <AppDrawer wide compactAccountingHeader open={selected !== null} onOpenChange={open => { if (!open) {setSelected(null);setEntryMode(null);closePreview();} }}
      title={rows.find(r=>r.id===selected)?.school_name??'Chi tiết hợp đồng'}
      description="Kế toán / Chi tiết hợp đồng">
      {!detail ? <output className="block space-y-3 p-3" aria-label="Đang tải chi tiết hợp đồng"><AppSkeleton className="h-6 w-2/3"/><AppSkeleton className="h-20 w-full"/><AppSkeleton className="h-28 w-full"/></output> : <div className="space-y-5 text-sm">
        <div className="space-y-2 rounded-xl bg-muted/25 p-4 sm:p-5">
          <p className="break-all text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chi tiết hợp đồng · {detail.data.contract_code}</p>
          <h2 className="text-xl font-bold">Hồ sơ hợp đồng</h2>
          <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>
            <span>{[detail.data.school_address, detail.data.school_district, detail.data.school_province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}</span>
          </p>
          <p className="flex items-center gap-2 text-muted-foreground"><UserRound className="size-4" aria-hidden="true"/>
            Phụ trách: {detail.data.owner_name} · {detail.data.personnel_type === 'COLLABORATOR' ? 'CTV' : 'Nhân viên'}
          </p>
          <span className="inline-flex rounded-full border px-2 py-1 text-xs font-medium">{detail.data.status === 'ACTIVE' ? 'Hợp đồng hợp lệ' : detail.data.status === 'PENDING_KIDSFIT' ? 'CHECKEE đã xác minh · Hồ sơ cũ cần rà soát bảo vệ' : detail.data.status === 'CANCELLED' ? 'Đã hủy · Lịch sử' : detail.data.status}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Giá trị hợp đồng gốc" value={channelMoney(detail.data.total_value)}/>
          <Metric label="Thực thu" value={channelMoney(detail.receipts.reduce((sum,x)=>sum+x.amount,0)-(detail.refunded_total??0))}/>
          <Metric label="Hoa hồng ghi nhận" value={channelMoney(detail.ledger.reduce((sum,x)=>sum+x.amount,0))}/>
          <Metric label="Hoa hồng đã chi" value={channelMoney(detail.payouts.filter(x=>x.status==='PAID').reduce((sum,x)=>sum+x.net_amount,0))}/>
        </div>
        {selected!==null&&<AccountingRenewalInline key={selected} apiBase={apiBase} token={token}
          contractId={selected} abilities={abilities}
          onChanged={async()=>{setDetailRevision(v=>v+1);await load();await onChanged();}}/>}
        {rows.find(r=>r.id===selected)&&(()=>{
          const overview=rows.find(r=>r.id===selected)!;
          return <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-bold">Tình trạng dịch vụ & quyền bảo vệ</h3>
            <AppStatusBadge variant="kidsfit-service" status={overview.service_status} label={{
              CONTINUOUS:'Đang sử dụng',EXPIRING_SOON:'Sắp hết hạn',
              INTERRUPTED:'Gián đoạn',THRESHOLD_REACHED:'Đủ 12 tháng',
              THRESHOLD_OVERDUE:'Quá 12 tháng',RELEASED:'Đã hết bảo vệ',
              NEEDS_REVIEW:'Cần rà soát',
              HISTORICAL_GAP:'Cần rà soát',
              MISSING_TERM:'Cần rà soát',INACTIVE:'Đã kết thúc'
            }[overview.service_status]??'Cần kiểm tra'}/>
            {overview.gap_start_on&&<p>Bắt đầu gián đoạn: {channelDate(overview.gap_start_on)}</p>}
            {overview.threshold_on&&<p>
              {overview.service_status==='INTERRUPTED'?'Mốc 12 tháng':'Đạt mốc'}: {channelDate(overview.threshold_on)}
            </p>}
            {overview.next_service_start_on&&<p>Kỳ sử dụng tiếp theo: {channelDate(overview.next_service_start_on)}</p>}
            <p>Quyền bảo vệ Sales: {detail.data.protection_until
              ? 'Đến '+channelDate(detail.data.protection_until)
              : 'Không có quyền bảo vệ đang hiệu lực'}</p>
            {giHistory.length>0&&<div className="space-y-2 border-t border-border pt-3">
              <h4 className="font-semibold">Lịch sử xử lý gián đoạn (GI-01)</h4>
              {giHistory.map((item,i)=><div key={i} className="rounded-lg border border-border p-3 text-xs">
                <p className="font-semibold">{item.status==='RELEASED'?'Đã giải phóng quyền':item.status==='REVIEW_REQUIRED'?'Chờ rà soát':item.status.startsWith('EXCEPTION_')?'Ngoại lệ cần xử lý':item.status} · {channelDate(item.processed_at)}</p>
                {item.reason&&<p className="mt-1 text-muted-foreground">Lý do: {item.reason}</p>}
                <p className="mt-1 text-muted-foreground">Bắt đầu: {channelDate(item.gap_start_on)} · Mốc 12 tháng: {channelDate(item.threshold_on)}</p>
              </div>)}
            </div>}
          </section>;
        })()}
        <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-bold text-foreground">Thông tin hợp đồng</h3>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 [&_dd]:break-words [&_dd]:leading-6 [&_dt]:text-xs">
            <div><dt className="text-muted-foreground">Mã hợp đồng</dt><dd className="mt-1 font-medium">{detail.data.contract_code}</dd></div>
            <div><dt className="text-muted-foreground">Ngày ký</dt><dd className="mt-1 font-medium">{channelDate(detail.data.signed_on)}</dd></div>
            <div><dt className="text-muted-foreground">CHECKEE xác minh</dt><dd className="mt-1 font-medium">{detail.data.verified_at ? channelDate(detail.data.verified_at) : 'Chưa xác minh'}</dd></div>
            <div><dt className="text-muted-foreground">Gói dịch vụ</dt><dd className="mt-1 font-medium">{getServicePlanLabel(detail.data.service_plan)}</dd></div>
            <div><dt className="text-muted-foreground">Ngày bắt đầu dịch vụ (hợp đồng gốc)</dt><dd className="mt-1 font-medium">{detail.data.source_service_start_on?channelDate(detail.data.source_service_start_on):'Chưa có thông tin kỳ dịch vụ'}</dd></div>
            <div><dt className="text-muted-foreground">Ngày kết thúc dịch vụ (hợp đồng gốc)</dt><dd className="mt-1 font-medium">{detail.data.source_service_end_on?channelDate(detail.data.source_service_end_on):'Chưa có thông tin kỳ dịch vụ'}</dd></div>
            <div><dt className="text-muted-foreground">Chu kỳ thanh toán (hợp đồng gốc)</dt><dd className="mt-1 font-medium">{detail.data.source_payment_cycle==='MONTHLY'?'Theo tháng':detail.data.source_payment_cycle==='YEARLY'?'Theo năm':'Chưa có thông tin kỳ dịch vụ'}</dd></div>
            <div><dt className="text-muted-foreground">Trạng thái dịch vụ hiện tại</dt><dd className="mt-1 font-medium">{detail.data.status==='CANCELLED'?'Đã hủy hợp đồng':detail.current_period?serviceStatus(detail.current_period.start_on,detail.current_period.end_on,detail.data.status):detail.next_confirmed_period?'Chưa bắt đầu sử dụng':detail.previous_period?'Đã kết thúc kỳ trước':'Chưa có thông tin kỳ dịch vụ'}</dd></div>
            <div><dt className="text-muted-foreground">Hạn bảo vệ Sales đã cấp</dt><dd className="mt-1 font-medium">{detail.data.protection_until?channelDate(detail.data.protection_until):'Chưa ghi nhận cấp quyền còn hiệu lực'}</dd></div>
            <div><dt className="text-muted-foreground">Số học sinh</dt><dd className="mt-1 font-medium">{detail.data.student_count ?? 'Chưa khai báo'}</dd></div>
          </dl>
          <div className="space-y-2">
            <p className="text-muted-foreground">Trường điểm / Phân hiệu triển khai</p>
            {detail.school_units.length > 0
              ? <ul className="list-inside list-disc space-y-1">{detail.school_units.map(unit=><li key={unit.id} className="font-medium">{unit.name}</li>)}</ul>
              : <p className="text-sm text-muted-foreground">Chỉ có trường chính, không có trường điểm / phân hiệu.</p>}
          </div>
          {detail.evidence.filter(x=>x.kind==='CONTRACT').map(x=><button key={x.id} type="button"
            className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left hover:bg-muted/40"
            onClick={()=>void viewEvidence(x.id,x.file_name,true)} title="Mở hợp đồng trong tab mới">
              <span className="flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0"/><span className="truncate">{x.file_name}</span></span>
              <ExternalLink className="size-4 shrink-0" aria-hidden="true"/>
            </button>)}
          {detail.evidence.every(x=>x.kind!=='CONTRACT') && <p className="text-muted-foreground">Chưa có file hợp đồng đính kèm. {detail.data.evidence_reference ?? ''}</p>}
          </section>
        <section className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-bold">Lịch thanh toán theo hợp đồng</h3>
          {detail.schedules.length===0 && <p className="text-muted-foreground">Chưa có lịch thanh toán.</p>}
          <div className="divide-y divide-border/70 rounded-lg border border-border/70">
            {detail.schedules.map(x=>{
              const paid = Math.max(0, Math.min(x.amount_due, x.amount_received));
              const percentage = x.amount_due > 0 ? Math.min(100, paid / x.amount_due * 100) : 0;
              const status = paymentScheduleLabel(x.status);
              const tone = x.status === 'PAID'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
                : x.status === 'OVERDUE'
                  ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
                  : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300';
              return <div key={x.id} className="space-y-3 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Hạn thanh toán</p>
                    <p className="font-semibold">{channelDate(x.due_on)}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-muted-foreground">Giá trị đợt</p>
                    <p className="font-bold tabular-nums">{channelMoney(x.amount_due)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${tone}`}>{status}</span>
                  <p className="text-xs text-muted-foreground tabular-nums">Đã thanh toán {channelMoney(x.amount_received)}</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`Tiến độ thanh toán ${Math.round(percentage)}%`}>
                  <div className="h-full rounded-full bg-green-700" style={{ width: `${percentage}%` }}/>
                </div>
              </div>;
            })}
          </div>
        </section>
        <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground">Nhà trường thanh toán</h3>
            {canRecordRevenue && detail.data.status==='ACTIVE' && <Button size="sm" disabled={saving || !detail.schedules.some(x=>x.amount_received<x.amount_due)}
              onClick={openReceipt}><Plus className="size-4"/> Thêm khoản thu</Button>}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Ngày nhận</th>
                  <th className="px-3 py-3">Mã giao dịch</th>
                  <th className="px-3 py-3 text-right">Số tiền</th>
                  <th className="w-16 px-3 py-3 text-center">Ảnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {detail.receipts.length===0 ? <tr><td colSpan={4} className="px-3 py-7 text-center text-muted-foreground">Chưa có khoản thu nào.</td></tr>
                  : detail.receipts.map(x=>{
                    const proof = detail.evidence.find(e=>e.revenue_receipt_id===x.id);
                    return <tr key={x.id} className="hover:bg-muted/20">
                      <td className="whitespace-nowrap px-3 py-3">{channelDate(x.received_at)}</td>
                      <td className="max-w-[160px] break-words px-3 py-3">{x.reference_code || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">{channelMoney(x.amount)}</td>
                      <td className="px-3 py-2 text-center">
                        {proof ? <Button type="button" variant="outline" size="icon" title="Xem ảnh nhà trường chuyển khoản"
                          aria-label={`Xem chứng từ khoản thu ${x.reference_code}`}
                          onClick={()=>void viewEvidence(proof.id,proof.file_name)}><ImageIcon className="size-4"/></Button>
                          : <span className="text-muted-foreground" aria-label="Không có ảnh chứng từ">—</span>}
                      </td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
        </section>
        <section aria-labelledby="contract-commission-heading"
          className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <WalletCards className="size-5" aria-hidden="true"/>
              </div>
              <div className="min-w-0 space-y-1">
                <h3 id="contract-commission-heading" className="text-base font-bold text-foreground">Hoa hồng & phiếu chi</h3>
                <p className="text-xs leading-5 text-muted-foreground">
                  Ghi nhận theo chính sách BGĐ và chi trả riêng cho Sales, Quản lý.
                </p>
              </div>
            </div>
            {canCompletePayout && detail.payouts.some(x=>x.status==='APPROVED') &&
              <Button size="sm" disabled={saving} onClick={()=>openPayoutPayment()}>
                <WalletCards className="size-4" aria-hidden="true"/> Ghi nhận chuyển khoản
              </Button>}
          </div>
          <div className="space-y-5 p-4 sm:p-5">
            {pendingBackfillReceipts.length>0&&
              <div className="overflow-hidden rounded-xl border border-amber-300/60 bg-amber-50/60 dark:border-amber-800/70 dark:bg-amber-950/20">
                <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    <AlertCircle className="size-5" aria-hidden="true"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-foreground">Cần đối soát khoản thu</h4>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {pendingBackfillReceipts.length} khoản thu đã lưu nhưng chưa có bút toán hoa hồng.
                      Đối soát trước để có thể lập phiếu chi; dữ liệu cũ không tự động tính lại.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-300/60 px-2 py-1 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                    Cần xử lý
                  </span>
                </div>
                <div className="divide-y divide-amber-200/70 border-t border-amber-200/70 bg-card/65 dark:divide-amber-900/50 dark:border-amber-900/50">
                  {pendingBackfillReceipts.map(receipt=>
                    <div key={receipt.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <ClipboardCheck className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold text-foreground">{receipt.reference_code||'Chưa có mã giao dịch'}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Nhận {channelDate(receipt.received_at)} · {channelMoney(receipt.amount)}</p>
                        </div>
                      </div>
                      {canAdjustCommission?
                        <Button type="button" size="sm" className="w-full shrink-0 sm:w-auto"
                          disabled={backfillBusy} onClick={()=>void openBackfill(receipt.id)}>
                          {backfillBusy?'Đang kiểm tra...':'Kiểm tra & đối soát'}<ArrowRight className="size-4" aria-hidden="true"/>
                        </Button>
                        :<p className="text-xs text-muted-foreground">Cần Kế toán có quyền đối soát để xử lý.</p>}
                    </div>)}
                </div>
              </div>}
            {detail.ledger.length===0 && pendingBackfillReceipts.length===0 &&
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                <WalletCards className="size-7 text-muted-foreground/70" aria-hidden="true"/>
                <p className="font-semibold">Chưa có hoa hồng được ghi nhận</p>
                <p className="max-w-sm text-xs leading-5 text-muted-foreground">
                  {detail.receipts.length===0
                    ?'Ghi nhận khoản thu tại mục “Nhà trường thanh toán” để phát sinh hoa hồng theo chính sách.'
                    :'Chưa có bút toán đủ điều kiện. Kiểm tra chính sách và quyền hưởng của hợp đồng.'}
                </p>
              </div>}
            {detail.ledger.length>0&&
              <div className="grid gap-3 sm:grid-cols-2">
                {(['SALES','MANAGER'] as const).map(role=>{
                  const entries=detail.ledger.filter(entry=>entry.beneficiary_role===role);
                  const assigned=entries.filter(entry=>entry.assigned_to_payout);
                  const unassigned=entries.filter(entry=>!entry.assigned_to_payout);
                  const rates=[...new Set(entries.filter(entry=>entry.entry_type==='ACCRUAL').map(entry=>entry.rate_percent))];
                  const totalAmount=entries.reduce((sum,entry)=>sum+entry.amount,0);
                  const availableAmount=unassigned.reduce((sum,entry)=>sum+entry.amount,0);
                  const name=entries[0]?.beneficiary_name;
                  return <div key={role} className="min-w-0 rounded-xl border border-border/80 bg-muted/15 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {role==='MANAGER'?<UsersRound className="size-4" aria-hidden="true"/>:<UserRound className="size-4" aria-hidden="true"/>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">{role==='SALES'?'Hoa hồng Sales':'Hoa hồng Quản lý'}</p>
                          <p className="truncate text-sm font-semibold" title={name||undefined}>{name||'Chưa xác định người hưởng'}</p>
                        </div>
                      </div>
                      {entries.length>0&&<span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                        {rates.length===1?`${rates[0]}%`:'Theo chính sách'}
                      </span>}
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">Hoa hồng ghi nhận</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{channelMoney(totalAmount)}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/70 pt-3 text-xs">
                      <span className="text-muted-foreground">Chưa đưa vào phiếu</span>
                      <span className="font-semibold tabular-nums text-foreground">{channelMoney(availableAmount)}</span>
                    </div>
                    {assigned.length>0&&<p className="mt-2 text-[11px] text-muted-foreground">
                      {assigned.length} bút toán đã được phân bổ vào phiếu chi
                    </p>}
                  </div>;
                })}
              </div>}
            {canCreatePayout && eligiblePeriods.length>0&&
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden="true"/> Có hoa hồng có thể lập phiếu
                    </p>
                    <p className="text-xs text-muted-foreground">Chọn đúng người hưởng và kỳ trước khi tạo phiếu nháp.</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="accounting-payout-beneficiary" className="text-xs font-medium">Người hưởng</label>
                    <AppSelect id="accounting-payout-beneficiary" ariaLabel="Người hưởng hoa hồng"
                      value={currentBeneficiary?.key??''}
                      onValueChange={value=>{setPayoutBeneficiary(value);setPayoutPeriod('');payoutKey.current=null;}}
                      options={beneficiaries.map(item=>({
                        value:item.key,label:`${item.role==='MANAGER'?'Quản lý':'Sales'} · ${item.name}`
                      }))} className="w-full"/>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <label htmlFor="accounting-payout-period" className="text-xs font-medium">Kỳ hoa hồng</label>
                    <AppSelect id="accounting-payout-period" ariaLabel="Kỳ hoa hồng để lập phiếu chi"
                      value={chosenPeriod} onValueChange={setPayoutPeriod}
                      options={eligiblePeriods.map(period=>({
                        value:period,label:`${payoutPeriodLabel(period)} · ${channelMoney(eligibleByPeriod.get(period)??0)}`
                      }))} className="w-full"/>
                  </div>
                  <Button type="button" className="h-10 w-full sm:col-span-2 lg:col-span-1 lg:w-auto" disabled={saving || !chosenPeriod}
                    onClick={()=>openDraft()}>
                    <Plus className="size-4" aria-hidden="true"/> Lập phiếu chi
                  </Button>
                </div>
              </div>}
            {canCreatePayout && eligiblePeriods.length===0 && detail.ledger.length>0 &&
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true"/>
                {detail.ledger.every(entry=>entry.assigned_to_payout)
                  ?'Hoa hồng đã được đưa vào phiếu chi. Kiểm tra trạng thái ở lịch sử bên dưới.'
                  :'Chưa có hoa hồng dương chưa phân bổ. Kiểm tra bút toán điều chỉnh và kỳ hoa hồng.'}
              </p>}
            {detail.ledger.some(entry=>entry.entry_type!=='ACCRUAL') &&
              <div className="rounded-lg border border-border/80 px-3 py-2 text-xs leading-5 text-muted-foreground">
                <strong className="text-foreground">Điều chỉnh hoa hồng:</strong>{' '}
                {detail.ledger.filter(entry=>entry.entry_type!=='ACCRUAL')
                  .map(entry=>`${entry.reason||'Điều chỉnh'} (${channelMoney(entry.amount)})`).join('; ')}
              </div>}
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Lịch sử phiếu chi</h4>
                <p className="mt-1 text-xs text-muted-foreground">Theo dõi từ khi lập nháp đến khi đã chuyển khoản.</p>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{detail.payouts.length} phiếu</span>
            </div>
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <table className="w-full min-w-[760px] table-fixed text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th scope="col" className="w-[23%] px-3 py-3">Mã phiếu</th>
                  <th scope="col" className="w-[21%] px-3 py-3">Người hưởng</th>
                  <th scope="col" className="w-[16%] px-3 py-3">Ngày chuyển</th>
                  <th scope="col" className="w-[14%] px-3 py-3 text-right">Số tiền</th>
                  <th scope="col" className="w-[15%] px-3 py-3">Trạng thái</th>
                  <th scope="col" className="w-[11%] px-3 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {detail.payouts.length===0 ?
                  <tr><td colSpan={6} className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <WalletCards className="size-6 text-muted-foreground/60" aria-hidden="true"/>
                      <span className="font-medium text-foreground">Chưa có phiếu chi</span>
                      <span className="text-xs text-muted-foreground">Phiếu sẽ xuất hiện sau khi lập từ hoa hồng đủ điều kiện.</span>
                    </div>
                  </td></tr>
                  : detail.payouts.map(x=>{
                    const proof = detail.evidence.find(e=>e.payout_id===x.id);
                    const latestRequest = x.events.filter(event=>event.event_type==='CHANGES_REQUESTED').at(-1);
                    const tone = x.status==='PAID'
                      ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
                      : x.status==='APPROVED'
                        ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300'
                        : 'border-border bg-muted/50 text-muted-foreground';
                    return <tr key={x.id} className="hover:bg-muted/20">
                      <td className="min-w-0 px-3 py-3">
                        <p className="truncate font-medium" title={x.code}>{x.code}</p>
                        {x.payment_reference&&<p className="mt-1 truncate text-xs text-muted-foreground" title={x.payment_reference}>{x.payment_reference}</p>}
                      </td>
                      <td className="px-3 py-3">{x.beneficiary_role==='MANAGER'?'Quản lý':'Sales'} · {detail.ledger.find(e=>e.beneficiary_user_id===x.beneficiary_user_id)?.beneficiary_name??'—'}</td>
                      <td className="whitespace-nowrap px-3 py-3">{x.paid_at?channelDate(x.paid_at):'Chưa chuyển'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{channelMoney(x.net_amount)}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex max-w-full whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium ${tone}`}>{payoutStatusLabel(x.status)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-nowrap justify-center gap-1">
                          {x.status==='CHANGES_REQUESTED'&&<Popover>
                            <PopoverTrigger type="button" title="Xem yêu cầu bổ sung từ BGĐ"
                              aria-label={`Xem yêu cầu bổ sung phiếu ${x.code}`}
                              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                              <MessageSquareText aria-hidden="true" className="size-4"/>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="end" className="w-[min(90vw,350px)] space-y-2 p-4">
                              <PopoverTitle className="text-sm font-semibold">BGĐ yêu cầu bổ sung</PopoverTitle>
                              <p className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{latestRequest?.reason?.trim()||'Chưa có nội dung yêu cầu.'}</p>
                              {latestRequest?.created_at&&<p className="text-xs text-muted-foreground">Yêu cầu lúc {channelDate(latestRequest.created_at)}</p>}
                            </PopoverContent>
                          </Popover>}
                          {proof&&<Button type="button" variant="outline" size="icon" title="Xem chứng từ khoản chi"
                            aria-label={`Xem chứng từ khoản chi ${x.code}`}
                            onClick={()=>void viewEvidence(proof.id,proof.file_name)}><ImageIcon className="size-4"/></Button>}
                          {(x.status==='DRAFT'||x.status==='CHANGES_REQUESTED')&&canCreatePayout&&<>
                            <AdminIconAction icon={Pencil} tone="neutral" disabled={saving}
                              label={`Sửa phiếu nháp ${x.code}`} onClick={()=>openDraft(x)}/>
                            <AdminIconAction icon={Send} tone="green" disabled={saving}
                              label={`Gửi phiếu ${x.code} đến BGĐ phê duyệt`}
                              onClick={()=>void submitPayout(x.id)}/>
                          </>}
                          {x.status==='PENDING_APPROVAL'&&canApprovePayout&&<>
                            <Button type="button" variant="outline" size="sm" disabled={saving}
                              onClick={()=>setReturningPayoutId(x.id)}>Yêu cầu bổ sung</Button>
                            <Button type="button" size="sm" disabled={saving}
                              onClick={()=>void approvePayout(x.id)}>Duyệt</Button>
                          </>}
                        </div>
                      </td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
          </div>
        </section>
      </div>}
    </AppDrawer>
    <AppDialog open={Boolean(backfillPreview)}
      onOpenChange={open=>{if(!open&&!backfillBusy)setBackfillPreview(null);}}
      busy={backfillBusy} title="Đối soát hoa hồng khoản thu cũ"
      description="Chỉ tạo bút toán mới sau khi Kế toán xem trước và xác nhận. Khoản đã có hoa hồng không được tự tính lại.">
      {backfillPreview&&<div className="space-y-4 text-sm">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bước 1 · Kiểm tra khoản thu</p>
          <p className="mt-2 text-xs text-muted-foreground">Khoản thực thu đủ điều kiện</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{channelMoney(backfillPreview.eligible_cash)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-background px-2 py-1">Mã phiếu thu #{backfillPreview.receipt_id}</span>
            <span className="rounded-md bg-background px-2 py-1">
              {backfillPreview.board_policy_version_id
                ?`Chính sách BGĐ #${backfillPreview.board_policy_version_id}`
                :'Chính sách BGĐ mặc định'}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bước 2 · Kiểm tra người hưởng</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Sales · {backfillPreview.sales_percent}%</p>
              <p className="mt-2 text-lg font-bold tabular-nums">{channelMoney(backfillPreview.sales_amount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Bút toán Sales</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">Quản lý · {backfillPreview.manager_percent}%</p>
              <p className="mt-2 text-lg font-bold tabular-nums">{channelMoney(backfillPreview.manager_amount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {backfillPreview.manager_name||'Chưa xác minh người hưởng'}
              </p>
            </div>
          </div>
        </div>
        {backfillPreview.requires_manager_verification&&
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6">
            <input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary"
              checked={backfillManagerVerified}
              onChange={event=>setBackfillManagerVerified(event.target.checked)}/>
            <span>
              <strong className="block font-semibold">Xác nhận Quản lý lịch sử</strong>
              Đã kiểm tra {backfillPreview.manager_name||'người quản lý'} thực sự phụ trách Sales
              tại ngày thu. Nếu chưa xác nhận, chỉ tạo phần Sales và phần Quản lý được giữ để rà soát.
            </span>
          </label>}
        {backfillPreview.manager_review_required&&
          <output className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 text-xs leading-5 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true"/>
            Chưa xác định được Quản lý hợp lệ. Chỉ tính hoa hồng Sales; phần Quản lý cần rà soát riêng.
          </output>}
        <div className="space-y-2">
          <label htmlFor="backfill-reason" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Bước 3 · Lý do đối soát *
          </label>
          <Input id="backfill-reason" maxLength={1000} value={backfillReason}
            onChange={event=>setBackfillReason(event.target.value)}
            placeholder="VD: Đã đối chiếu khoản thu và chứng từ với Kế toán"/>
          <p className="text-xs text-muted-foreground">Lý do được lưu trong lịch sử kiểm tra tài chính.</p>
        </div>
        {!backfillPreview.can_apply&&<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Khoản thu đã có bút toán hoặc không còn số tiền hợp lệ; không thể tạo trùng.
        </p>}
        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto"
            disabled={backfillBusy} onClick={()=>setBackfillPreview(null)}>Hủy</Button>
          <Button type="button" className="w-full sm:w-auto"
            disabled={backfillBusy||!backfillPreview.can_apply||!backfillReason.trim()}
            onClick={()=>void confirmBackfill()}>
            {backfillBusy?'Đang đối soát...':'Xác nhận tạo bút toán'} <ArrowRight className="size-4" aria-hidden="true"/>
          </Button>
        </div>
      </div>}
    </AppDialog>
    <AppDialog open={Boolean(returningPayoutId)}
      onOpenChange={open=>{if(!open&&!saving){setReturningPayoutId(null);setPayoutReturnReason('');}}}
      busy={saving} title="BGĐ yêu cầu bổ sung" description="Nêu lý do và trả phiếu về Kế toán chỉnh sửa.">
      <div className="space-y-3">
        <label htmlFor="payout-return-reason" className="text-sm font-medium">Lý do yêu cầu bổ sung *</label>
        <textarea id="payout-return-reason" className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-sm"
          value={payoutReturnReason} onChange={event=>setPayoutReturnReason(event.target.value)} maxLength={1000}/>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={()=>setReturningPayoutId(null)}>Hủy</Button>
          <Button type="button" disabled={saving||!payoutReturnReason.trim()}
            onClick={()=>void returnPayout()}>Trả về Kế toán</Button>
        </div>
      </div>
    </AppDialog>
    <AppDialog open={Boolean(detail&&payoutDialogOpen)}
      onOpenChange={open=>{if(!saving){setPayoutDialogOpen(open);if(!open){payoutKey.current=null;setEditingPayout(null);}}}}
      busy={saving} title={editingPayout?'Chỉnh sửa phiếu chi Nháp':'Lập phiếu chi hoa hồng'}
      description="Kế toán được sửa % và tiền hoa hồng. BGĐ sẽ xem cả đề xuất gốc và số liệu điều chỉnh.">
      {detail&&payoutDialogOpen&&<form className="space-y-4 text-sm" onSubmit={event=>{event.preventDefault();void createPayout();}}>
        {editingPayout?.status==='CHANGES_REQUESTED'&&<section className="rounded-xl border border-amber-300/70 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <MessageSquareText aria-hidden="true" className="size-4"/> BGĐ yêu cầu bổ sung
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {editingPayout.events.filter(event=>event.event_type==='CHANGES_REQUESTED').at(-1)?.reason?.trim()||'Chưa có nội dung yêu cầu.'}
          </p>
        </section>}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
          <p className="text-xs font-medium text-muted-foreground">Người hưởng</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <UserRound className="size-4 text-primary" aria-hidden="true"/>
            <span className="font-semibold text-foreground">{editingPayout
              ? detail.ledger.find(entry=>entry.beneficiary_user_id===editingPayout.beneficiary_user_id)?.beneficiary_name??'Người hưởng'
              : currentBeneficiary?.name??'Chưa chọn người hưởng'}</span>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {(editingPayout?.beneficiary_role??currentBeneficiary?.role)==='MANAGER'?'Quản lý':'Sales'}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Hợp đồng {detail.data.contract_code} · Kỳ hoa hồng {payoutPeriodLabel(editingPayout?.period??chosenPeriod)}</p>
        </div>
        <div className="space-y-3 rounded-xl border border-border/80 p-4">
          <p className="text-xs text-muted-foreground">Hệ thống đề xuất:{' '}
            {editingPayout?.suggested_rate_percent??suggestedRate}% ·
            {channelMoney(editingPayout?.suggested_amount??(eligibleByPeriod.get(chosenPeriod)??0))}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="payout-rate" className="text-sm font-medium">% Hoa hồng</label>
              <Input id="payout-rate" type="number" min={0} max={100} step="0.0001"
                value={payoutRate} onChange={event=>{
                  const rate=event.target.value;setPayoutRate(rate);payoutKey.current=null;
                  const originalRate=editingPayout?.suggested_rate_percent??suggestedRate;
                  const originalAmount=editingPayout?.suggested_amount??(eligibleByPeriod.get(chosenPeriod)??0);
                  const base=originalRate>0?originalAmount*100/originalRate:0;
                  if(Number.isFinite(Number(rate))&&base>0)
                    setPayoutRequestedAmount(String(Math.round(base*Number(rate)/100)));
                }}/>
            </div>
            <div className="space-y-1">
              <label htmlFor="payout-amount" className="text-sm font-medium">Tiền hoa hồng (VNĐ)</label>
              <AppCurrencyInput id="payout-amount" value={payoutRequestedAmount}
                onValueChange={value=>{setPayoutRequestedAmount(value);payoutKey.current=null;}}/>
            </div>
          </div>
          {(Number(payoutRate)!==(editingPayout?.suggested_rate_percent??suggestedRate)
            ||parseMoneyInput(payoutRequestedAmount)!==(editingPayout?.suggested_amount??(eligibleByPeriod.get(chosenPeriod)??0)))&&
            <div className="space-y-1 rounded-lg border border-amber-300/60 bg-amber-50/50 p-3 dark:bg-amber-950/20">
              <label htmlFor="payout-adjustment-reason" className="text-sm font-semibold">Lý do điều chỉnh *</label>
              <Input id="payout-adjustment-reason" value={payoutAdjustmentReason}
                onChange={event=>setPayoutAdjustmentReason(event.target.value)}
                maxLength={1000} placeholder="Vì sao số liệu khác đề xuất của hệ thống?"/>
              <p className="text-xs text-muted-foreground">Có thể lưu Nháp; bắt buộc nhập lý do trước khi gửi BGĐ.</p>
            </div>}
          <div className="space-y-1">
            <label htmlFor="payout-withholding" className="text-sm font-medium">Khấu trừ (VNĐ)</label>
            <AppCurrencyInput id="payout-withholding" value={payoutWithholding}
              onValueChange={value=>{setPayoutWithholding(value);payoutKey.current=null;setPayoutError('');}}/>
          </div>
          {parseMoneyInput(payoutWithholding)>0&&<div className="space-y-1">
            <label htmlFor="payout-withholding-reason" className="text-sm font-medium">Lý do khấu trừ *</label>
            <Input id="payout-withholding-reason" value={payoutWithholdingReason}
              onChange={event=>setPayoutWithholdingReason(event.target.value)} maxLength={1000} required/>
          </div>}
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="font-semibold text-foreground">Dự kiến thực chi</span>
            <strong className="text-xl font-bold tabular-nums text-primary">
              {channelMoney(Math.max(0,parseMoneyInput(payoutRequestedAmount)-parseMoneyInput(payoutWithholding)))}
            </strong>
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
          <ClipboardCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>
          Thao tác này chỉ lập phiếu ở trạng thái Nháp, chưa ghi nhận chuyển khoản.
          Giá trị chính thức sẽ được Backend kiểm tra.
        </p>
        {payoutError&&<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{payoutError}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto"
            disabled={saving} onClick={()=>{setPayoutDialogOpen(false);payoutKey.current=null;}}>Hủy</Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={saving||!chosenPeriod}>
            {saving?'Đang lưu...':'Lưu nháp'}
          </Button>
        </div>
      </form>}
    </AppDialog>
    <AppDialog open={Boolean(detail && entryMode)} onOpenChange={open=>{if(!open && !saving){setEntryMode(null);receiptAttempt.current=null;}}}
      busy={saving} title={entryMode==='receipt'?'Thêm khoản thu từ nhà trường':'Thêm khoản chi hoa hồng'}
      description="Nhập đúng ngày, số tiền và ảnh chứng từ cho giao dịch.">
      {detail && entryMode && <form noValidate className="space-y-4" onChange={event=>{
        const name = event.target.getAttribute('name') as keyof FieldErrors | null;
        if (!name) return;
        setFieldErrors(current => {
          if (!current[name]) return current;
          const updated = { ...current };
          delete updated[name];
          return updated;
        });
      }} onSubmit={event=>void sendRecord(event)}>
        {entryMode==='receipt' ? <label className="block space-y-1"><span>Đợt thanh toán *</span>
          <select name="schedule_id" required value={selectedScheduleId??''}
            onChange={e=>{setSelectedScheduleId(Number(e.target.value)||null);receiptAttempt.current=null;setFieldErrors({});}}
            className="w-full rounded-lg border bg-background p-2">
            {detail.schedules.filter(x=>x.amount_received<x.amount_due).map(x=><option key={x.id} value={x.id}>
              {channelDate(x.due_on)} · Còn {channelMoney(x.amount_due-x.amount_received)}</option>)}
          </select>{selectedScheduleId!==null&&<p className="text-xs text-muted-foreground">
              Còn phải thu: {channelMoney(Math.max(0,
                (detail.schedules.find(x=>x.id===selectedScheduleId)?.amount_due??0)-
                (detail.schedules.find(x=>x.id===selectedScheduleId)?.amount_received??0)))}
            </p>}{fieldErrors.schedule_id && <span role="alert" className="text-xs text-red-700">{fieldErrors.schedule_id}</span>}</label> : <label className="block space-y-1"><span>Phiếu chi đã duyệt *</span>
          <select name="payout_id" required value={selectedPayoutId??''}
            onChange={e=>{
              const id=Number(e.target.value);
              setSelectedPayoutId(id);receiptAttempt.current=null;setFieldErrors({});
              setAmountInput(String(detail.payouts.find(x=>x.id===id)?.net_amount??''));
            }} className="w-full rounded-lg border bg-background p-2">
            {detail.payouts.filter(x=>x.status==='APPROVED').map(x=><option key={x.id} value={x.id}>{x.code} · {channelMoney(x.net_amount)}</option>)}
          </select>{fieldErrors.payout_id && <span role="alert" className="text-xs text-red-700">{fieldErrors.payout_id}</span>}</label>}
        <div className="space-y-1"><label htmlFor="accounting-transaction-date">Ngày giao dịch *</label>
          <Input id="accounting-transaction-date" type="date" name="transaction_date" required aria-invalid={Boolean(fieldErrors.transaction_date)} defaultValue={accountingBusinessDay(new Date())}/>{fieldErrors.transaction_date && <p role="alert" className="text-xs text-red-700">{fieldErrors.transaction_date}</p>}</div>
        <div className="space-y-1"><label htmlFor="accounting-amount">{entryMode==='receipt'?'Số tiền nhà trường thực trả (VNĐ) *':'Số tiền đã chuyển (VNĐ) *'}</label>
          <div className="relative">
            <AppCurrencyInput id="accounting-amount" name="amount"
              placeholder="0" required aria-invalid={Boolean(fieldErrors.amount)} value={amountInput}
              onValueChange={setAmountInput}
              className="pr-12 tabular-nums text-right"/>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">đ</span>
          </div>
          {fieldErrors.amount && <p role="alert" className="text-xs text-red-700">{fieldErrors.amount}</p>}</div>
        {entryMode==='payout' && <p className="text-xs text-muted-foreground">Số tiền chi phải khớp phiếu chi đã duyệt; chưa hỗ trợ chia nhỏ một phiếu chi.</p>}
        <div className="space-y-1"><label htmlFor="accounting-bank-reference">Mã giao dịch ngân hàng *</label>
          <Input id="accounting-bank-reference" name="reference_code" required maxLength={64} aria-invalid={Boolean(fieldErrors.reference_code)}/>{fieldErrors.reference_code && <p role="alert" className="text-xs text-red-700">{fieldErrors.reference_code}</p>}</div>
        <div className="space-y-1"><label htmlFor="accounting-bank-proof">Ảnh chứng từ chuyển khoản *</label>
          <Input id="accounting-bank-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required aria-invalid={Boolean(fieldErrors.proof)}/>
          {fieldErrors.proof && <p role="alert" className="text-xs text-red-700">{fieldErrors.proof}</p>}
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · tối đa 5 MB · lưu riêng tư theo phân quyền</p></div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" disabled={saving} onClick={()=>setEntryMode(null)}>Hủy</Button>
          <Button type="submit" disabled={saving}>{saving?'Đang lưu...':entryMode==='receipt'?'Ghi nhận khoản thu':'Xác nhận đã chuyển tiền'}</Button>
        </div>
      </form>}
    </AppDialog>
    <EvidencePreviewDialog preview={preview} onClose={closePreview}/>
  </div>;
}

function Metric({ label, value }: {label:string;value:string}) {
  return <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold tabular-nums tracking-tight">{value}</p></div>;
}
