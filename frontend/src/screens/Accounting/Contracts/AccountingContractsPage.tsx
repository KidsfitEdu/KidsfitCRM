'use client';

import { getServicePlanLabel } from '@/lib/contract-payment-plan';
import { accountingTransactionTimestamp, contractSignedDay, validateTransactionDay } from '@/lib/accounting-transaction-date';
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardCheck, Eye, FileCheck2, HandCoins, Image as ImageIcon, MapPin, MessageSquareText, Pencil, Plus, RotateCcw, Search, Send, UserRound, UsersRound, WalletCards } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppPagination } from '@/components/common/app-pagination';
import { AppSelect } from '@/components/common/app-select';
import { AdminIconAction, AdminListPanel, AdminListToolbar, adminTableClass, adminTableHeadClass } from '@/components/common/admin-list-ui';
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

const payoutEventLabel = (eventType: string) => ({
  CREATED:'Đã lập phiếu',EDITED:'Đã chỉnh sửa',SUBMITTED:'Đã gửi BGĐ',
  CHANGES_REQUESTED:'BGĐ yêu cầu bổ sung',APPROVED:'BGĐ đã duyệt',
  PAID:'Kế toán đã chi',REJECTED:'Đã từ chối',CANCELLED:'Đã hủy',
} as Record<string,string>)[eventType] ?? 'Sự kiện phiếu chi';

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
type ReceiptRow = {
  id:number;contract_id:number;contract_code:string;school_name:string;
  amount:number;received_at:string;reference_code:string;payment_method:string;
  status:string;schedule_id:number|null;proof_id:number|null;proof_file_name:string|null;
};
type ReceiptList = {data:ReceiptRow[];total:number;page:number;page_size:number};
type ReceivableContract={id:number;code:string;school_name:string;amount_remaining:number};
type ReceivableList={data:ReceivableContract[];total:number;page:number;page_size:number};
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
  const [accountingTab,setAccountingTab]=useState<'CONTRACTS'|'RECEIPTS'|'PAYOUTS'>('CONTRACTS');
  const [receiptRows,setReceiptRows]=useState<ReceiptRow[]>([]);
  const [receiptTotal,setReceiptTotal]=useState(0);
  const [receiptPage,setReceiptPage]=useState(1);
  const [receiptPageSize,setReceiptPageSize]=useState(20);
  const [receiptSearch,setReceiptSearch]=useState('');
  const [receiptAppliedSearch,setReceiptAppliedSearch]=useState('');
  const [receiptYear,setReceiptYear]=useState('ALL');
  const [receiptLoading,setReceiptLoading]=useState(false);
  const [receiptRevision,setReceiptRevision]=useState(0);
  const [receiptPreview,setReceiptPreview]=useState<ReceiptRow|null>(null);
  const [receivableSearch,setReceivableSearch]=useState('');
  const [receivablePage,setReceivablePage]=useState(1);
  const [receivableRows,setReceivableRows]=useState<ReceivableContract[]>([]);
  const [receivableTotal,setReceivableTotal]=useState(0);
  const [receivableLoading,setReceivableLoading]=useState(false);
  const [receiptIntent,setReceiptIntent]=useState(false);
  const [financePeriod,setFinancePeriod]=useState(()=>new Intl.DateTimeFormat('sv-SE',{
    timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'
  }).format(new Date()));
  const [financeStatus,setFinanceStatus]=useState('ALL');
  const [financeOrganization,setFinanceOrganization]=useState('ALL');
  const [financeSearch,setFinanceSearch]=useState('');
  const [financeAppliedSearch,setFinanceAppliedSearch]=useState('');
  const [financePage,setFinancePage]=useState(1);
  const [financePageSize,setFinancePageSize]=useState(20);
  const [financeLoading,setFinanceLoading]=useState(false);
  const [financeRole,setFinanceRole]=useState('ALL');
  const [financeOverview,setFinanceOverview]=useState<FinanceWorkspace|null>(null);
  const [payoutPickerOpen,setPayoutPickerOpen]=useState(false);
  const [payoutPickerSearch,setPayoutPickerSearch]=useState('');
  const [payoutCandidateKey,setPayoutCandidateKey]=useState('');
  const [payoutPreview,setPayoutPreview]=useState<FinanceWorkspace['payouts'][number]|null>(null);
  const [centralPayoutIntent,setCentralPayoutIntent]=useState<{
    contractId:number;beneficiaryUserId:number;role:'SALES'|'MANAGER';period:string;
    mode:'CREATE'|'EDIT'|'COMPLETE';payoutId?:number;
  }|null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [giHistory,setGiHistory]=useState<{status:string;gap_start_on:string;threshold_on:string;processed_at:string;reason:string}[]>([]);
  const [detailRevision, setDetailRevision] = useState(0);
  const loadedContractId = useRef<number | null>(null);
  const payoutSectionRef = useRef<HTMLElement | null>(null);
  const [payoutHistoryYear,setPayoutHistoryYear] = useState('ALL');
  const [payoutHistoryStatus,setPayoutHistoryStatus] = useState('ALL');
  const [payoutHistoryPage,setPayoutHistoryPage] = useState(1);
  const [receiptHistoryYear,setReceiptHistoryYear] = useState('ALL');
  const [receiptHistoryPage,setReceiptHistoryPage] = useState(1);
  const [showAllSchedules,setShowAllSchedules] = useState(false);
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
  const canRecordRevenue = abilities.includes('channel_sales.revenue.record') || abilities.includes('*');
  const canCompletePayout = abilities.includes('channel_sales.payout.complete') || abilities.includes('*');
  const canCreatePayout = abilities.includes('channel_sales.payout.create') || abilities.includes('*');
  const canAdjustCommission=abilities.includes('channel_sales.commission.adjust')||abilities.includes('*');
  const canApprovePayout = abilities.includes('channel_sales.payout.approve') || abilities.includes('*');
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
    setFinanceLoading(true);
    setFinanceOverview(null);
    void channelRequest<FinanceWorkspace>(apiBase,token,
      `/finance?period=${encodeURIComponent(financePeriod)}`)
      .then(value=>{if(active)setFinanceOverview(value);})
      .catch(cause=>{if(active)appNotice.error('Không tải được danh sách phiếu chi.',
        cause instanceof Error?cause.message:'Vui lòng thử lại.');})
      .finally(()=>{if(active)setFinanceLoading(false);});
    return()=>{active=false;};
  },[apiBase,token,connected,accountingTab,financePeriod,detailRevision]);

  useEffect(()=>{
    if(!connected||accountingTab!=='RECEIPTS')return;
    let active=true;
    setReceiptLoading(true);
    const params=new URLSearchParams({page:String(receiptPage),page_size:String(receiptPageSize)});
    if(receiptAppliedSearch)params.set('search',receiptAppliedSearch);
    if(receiptYear!=='ALL')params.set('year',receiptYear);
    void channelRequest<ReceiptList>(apiBase,token,'/accounting/receipts?'+params)
      .then(res=>{if(active){setReceiptRows(res.data);setReceiptTotal(res.total);}})
      .catch(error=>{if(active)appNotice.error('Không tải được khoản thu.',error instanceof Error?error.message:'Thử lại sau.');})
      .finally(()=>{if(active)setReceiptLoading(false);});
    return()=>{active=false;};
  },[apiBase,token,connected,accountingTab,receiptPage,receiptPageSize,receiptAppliedSearch,receiptYear,receiptRevision]);

  useEffect(()=>{
    if(!connected||!canRecordRevenue||accountingTab!=='RECEIPTS'||!receiptIntent)return;
    let active=true;
    setReceivableLoading(true);
    const params=new URLSearchParams({page:String(receivablePage)});
    if(receivableSearch.trim())params.set('search',receivableSearch.trim());
    void channelRequest<ReceivableList>(apiBase,token,'/accounting/receivable-contracts?'+params)
      .then(res=>{if(active){setReceivableRows(res.data);setReceivableTotal(res.total);}})
      .catch(error=>{if(active)appNotice.error('Không tải được hợp đồng còn phải thu.',error instanceof Error?error.message:'Thử lại sau.');})
      .finally(()=>{if(active)setReceivableLoading(false);});
    return()=>{active=false;};
  },[apiBase,token,connected,canRecordRevenue,accountingTab,receiptIntent,receivableSearch,receivablePage,receiptRevision]);

  useEffect(() => {
    if (!connected || selected === null) { loadedContractId.current=null; setDetail(null); return; }
    let live = true;
    // Retain the current content during a refresh so the drawer does not collapse and jump.
    if (loadedContractId.current !== selected) {
      loadedContractId.current = selected;
      setDetail(null);
      setPayoutHistoryYear('ALL');
      setPayoutHistoryStatus('ALL');
      setPayoutHistoryPage(1);
      setReceiptHistoryYear('ALL');
      setReceiptHistoryPage(1);
      setShowAllSchedules(false);
    }
    void channelRequest<Detail>(apiBase, token, `/accounting/contracts/${selected}`)
      .then(value => { if (live) setDetail(value); })
      .catch(cause => { if (live) appNotice.error('Không tải được chi tiết hợp đồng.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.'); });
    return () => { live = false; };
  }, [apiBase, token, selected, connected, detailRevision]);

  // Resolve the selected school before opening the existing verified-cash form.
  useEffect(()=>{
    if(!receiptIntent||accountingTab!=='RECEIPTS'||!detail||detail.data.id!==selected)return;
    const due=detail.schedules.find(x=>x.amount_received<x.amount_due);
    if(!due){appNotice.error('Hợp đồng này không còn đợt thanh toán có thể thu.');setReceiptIntent(false);return;}
    setSelectedScheduleId(due.id);
    setFieldErrors({});setAmountInput('');receiptAttempt.current=null;
    setReceiptIntent(false);setEntryMode('receipt');
  },[receiptIntent,accountingTab,detail,selected]);

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

  const openReceiptForm=()=>{
    setSelected(null);setDetail(null);setReceivableSearch('');setReceivablePage(1);
    setReceiptIntent(true);setFieldErrors({});setAmountInput('');setEntryMode(null);
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
      if(entryMode==='receipt'){setReceiptRevision(v=>v+1);setReceiptIntent(false);}
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
  const orderedSchedules=(detail?.schedules??[]).slice().sort((a,b)=>
    Number(a.amount_received>=a.amount_due)-Number(b.amount_received>=b.amount_due)||
    b.due_on.localeCompare(a.due_on)||b.id-a.id);
  const receiptYears=[...new Set((detail?.receipts??[]).map(x=>x.received_at.slice(0,4)).filter(x=>/^\d{4}$/.test(x)))].sort().reverse();
  const filteredReceipts=(detail?.receipts??[]).filter(x=>receiptHistoryYear==='ALL'||x.received_at.startsWith(receiptHistoryYear+'-'))
    .slice().sort((a,b)=>b.received_at.localeCompare(a.received_at)||b.id-a.id);
  const receiptPageCount=Math.max(1,Math.ceil(filteredReceipts.length/10));
  const effectiveReceiptPage=Math.min(receiptHistoryPage,receiptPageCount);
  const visibleReceipts=filteredReceipts.slice((effectiveReceiptPage-1)*10,effectiveReceiptPage*10);
  const payoutYears=[...new Set((detail?.payouts??[]).map(x=>x.period.slice(0,4)).filter(x=>/^\d{4}$/.test(x)))].sort().reverse();
  const payoutFiltered=(detail?.payouts??[]).filter(x=>(payoutHistoryYear==='ALL'||x.period.startsWith(payoutHistoryYear+'-'))&&(payoutHistoryStatus==='ALL'||x.status===payoutHistoryStatus));
  const payoutPageCount=Math.max(1,Math.ceil(payoutFiltered.length/10));
  const effectivePayoutPage=Math.min(payoutHistoryPage,payoutPageCount);
  const payoutVisible=payoutFiltered.slice((effectivePayoutPage-1)*10,effectivePayoutPage*10);
  const openCentralPayout=(intent:NonNullable<typeof centralPayoutIntent>)=>{
    setPayoutPreview(null);
    setCentralPayoutIntent(intent);
    setSelected(intent.contractId);
  };
  // The detail API is the authority for draft amounts and contract-scoped ledger.
  // It is loaded without opening the contract Drawer when working in the payout tab.
  useEffect(()=>{
    if(!centralPayoutIntent||!detail||detail.data.id!==centralPayoutIntent.contractId)return;
    const intent=centralPayoutIntent;
    if(intent.mode==='CREATE'){
      const entries=detail.ledger.filter(x=>!x.assigned_to_payout
        &&x.beneficiary_role===intent.role&&x.beneficiary_user_id===intent.beneficiaryUserId
        &&x.period===intent.period);
      const amount=entries.reduce((sum,x)=>sum+x.amount,0);
      if(amount<=0){
        appNotice.error('Không còn hoa hồng đủ điều kiện để lập phiếu trong kỳ này.');
      }else{
        const base=entries.filter(x=>x.entry_type==='ACCRUAL').reduce((sum,x)=>sum+x.calculation_base,0);
        setPayoutBeneficiary(intent.role+':'+intent.beneficiaryUserId);
        setPayoutPeriod(intent.period);
        setEditingPayout(null);
        setPayoutRate(String(base>0?Number((amount/base*100).toFixed(4)):0));
        setPayoutRequestedAmount(String(amount));
        setPayoutAdjustmentReason('');setPayoutWithholding('0');
        setPayoutWithholdingReason('');setPayoutError('');
        payoutKey.current=null;setPayoutDialogOpen(true);
      }
    }else{
      const payout=detail.payouts.find(x=>x.id===intent.payoutId);
      if(!payout){appNotice.error('Không tìm thấy phiếu trong hợp đồng đã chọn.');}
      else if(intent.mode==='EDIT'){
        setEditingPayout(payout);setPayoutError('');
        setPayoutRate(String(payout.requested_rate_percent));
        setPayoutRequestedAmount(String(payout.requested_amount));
        setPayoutAdjustmentReason(payout.adjustment_reason??'');
        setPayoutWithholding(String(payout.withholding_amount??0));
        setPayoutWithholdingReason(payout.withholding_reason??'');
        payoutKey.current=null;setPayoutDialogOpen(true);
      }else if(payout.status==='APPROVED'){
        setFieldErrors({});
        setSelectedPayoutId(payout.id);setSelectedScheduleId(null);
        setAmountInput(String(payout.net_amount));
        receiptAttempt.current=null;setEntryMode('payout');
      }else {appNotice.error('Phiếu chưa được phê duyệt để ghi nhận chuyển khoản.');}
    }
    setCentralPayoutIntent(null);
  // Act only on a newly selected intent and its loaded contract; never auto-reopen on refresh.
  },[centralPayoutIntent,detail]);
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
  const financeKeyword=financeAppliedSearch.trim().toLocaleLowerCase('vi-VN');
  const displayedPayouts=(financeOverview?.payouts??[])
    .filter(p=>(financeStatus==='ALL'||p.status===financeStatus)
      &&(financeRole==='ALL'||p.beneficiary_role===financeRole)
      &&(financeOrganization==='ALL'||p.organization_id===Number(financeOrganization))
      &&(!financeKeyword||[p.code,p.beneficiary_name,...(p.school_names??[]),...(p.contract_codes??[])].some(x=>x.toLocaleLowerCase('vi-VN').includes(financeKeyword))));
  const visiblePayouts=displayedPayouts.slice((financePage-1)*financePageSize,financePage*financePageSize);
  const eligibleCandidates=(financeOverview?.eligible_payouts??[])
    .filter(x=>(financeRole==='ALL'||x.beneficiary_role===financeRole)
      &&(financeOrganization==='ALL'||x.organization_id===Number(financeOrganization)));
  const payoutChoices=eligibleCandidates.filter(x=>!payoutPickerSearch.trim()||
    [x.school_name,x.contract_code,x.beneficiary_name].some(text=>
      text.toLocaleLowerCase('vi-VN').includes(payoutPickerSearch.trim().toLocaleLowerCase('vi-VN'))));
  const candidateKey=(item:typeof eligibleCandidates[number])=>[item.contract_id,item.beneficiary_user_id,item.beneficiary_role,item.period].join(':');
  const chosenCandidate=payoutChoices.find(item=>candidateKey(item)===payoutCandidateKey);
  const resetFinanceFilters=()=>{
    setFinanceSearch('');setFinanceAppliedSearch('');setFinanceOrganization('ALL');
    setFinanceRole('ALL');setFinanceStatus('ALL');setFinancePage(1);
  };
  return <div className="space-y-5">
    {!connected && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">Cần đăng nhập bằng tài khoản có quyền xem hoa hồng để tải dữ liệu thực tế.</p>}
    <div role="tablist" aria-label="Nghiệp vụ Kế toán"
      className="flex gap-x-6 gap-y-1 overflow-x-auto border-b border-border bg-transparent [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {([{key:'CONTRACTS',label:'Hợp đồng',icon:FileCheck2},
         {key:'RECEIPTS',label:'Khoản thu nhà trường',icon:HandCoins},
         {key:'PAYOUTS',label:'Phiếu chi hoa hồng',icon:WalletCards}] as const).map(item=>
        <button type="button" role="tab" key={item.key}
          aria-selected={accountingTab===item.key} onClick={()=>{setAccountingTab(item.key);setSelected(null);setPayoutDialogOpen(false);setPayoutPickerOpen(false);setReceiptIntent(false);setEntryMode(null);setCentralPayoutIntent(null);}}
          className={`-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${accountingTab===item.key
            ?'border-[#1b5e20] text-[#1b5e20] dark:border-green-400 dark:text-green-400'
            :'border-transparent text-muted-foreground hover:border-border hover:text-foreground'}`}>
          <item.icon className="size-4 shrink-0" aria-hidden="true"/>
          <span>{item.label}</span>
        </button>)}
    </div>
    {accountingTab==='CONTRACTS'&&<AdminListPanel className="min-w-0">
      <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-3 border-b border-border/80 px-5 py-5 sm:px-6">
        <div className="relative min-w-[220px] flex-[1_1_320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <Input aria-label="Tìm hợp đồng và hoa hồng" className="h-10 w-full rounded-lg bg-card pl-10"
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
        <AppButton type="button" tone="outline" size="icon-lg" className="h-10 w-10 min-w-10 rounded-lg p-0"
          aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={resetFilters}>
          <RotateCcw className="size-4" aria-hidden="true"/>
        </AppButton>
      </form>
      {busy && rows.length > 0 && <div className="px-4 py-2"><InlineLoading label="Đang cập nhật danh sách hợp đồng..." /></div>}
      {busy && rows.length === 0 ? <output className="block space-y-3 p-5" aria-label="Đang tải danh sách hợp đồng">{Array.from({length: 6}, (_, index) => <AppSkeleton key={index} className="h-11 w-full" />)}</output> : <div className="min-w-0">
        <table className="block w-full text-left text-sm xl:table xl:table-fixed xl:text-xs 2xl:text-sm">
          <thead className={`${adminTableHeadClass} hidden xl:table-header-group`}>
            <tr>
              <th scope="col" className="w-[19%] px-3 py-3">Nhà trường</th>
              <th scope="col" className="w-[12%] px-2 py-3">Sales phụ trách</th>
              <th scope="col" className="w-[10%] px-2 py-3">Kỳ sử dụng</th>
              <th scope="col" className="w-[16%] px-2 py-3">Dịch vụ</th>
              <th scope="col" className="w-[12%] px-2 py-3">Cần xử lý</th>
              <th scope="col" className="w-[12%] px-2 py-3 text-right">Tổng thực thu</th>
              <th scope="col" className="w-[13%] px-2 py-3 text-right">Tổng hoa hồng</th>
              <th scope="col" className="w-[6%] px-1 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="block divide-y divide-border/70 xl:table-row-group">
            {rows.map(row=>{
              const state=row.service_status;
              const label:Record<string,string>={
                CONTINUOUS:'Đang sử dụng',EXPIRING_SOON:'Sắp hết hạn',
                INTERRUPTED:'Gián đoạn',THRESHOLD_REACHED:'Đủ 12 tháng',
                THRESHOLD_OVERDUE:'Quá 12 tháng',RELEASED:'Đã hết bảo vệ',
                NEEDS_REVIEW:'Cần rà soát',INACTIVE:'Đã kết thúc',
                HISTORICAL_GAP:'Cần rà soát',MISSING_TERM:'Cần rà soát'
              };
              return <tr key={row.id} className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-3 px-3 py-4 transition-colors even:bg-muted/20 hover:bg-muted/40 sm:grid-cols-3 xl:table-row xl:p-0">
                <td className="col-span-2 min-w-0 align-middle sm:col-span-1 xl:px-3 xl:py-3"><p className="mb-1 text-xs text-muted-foreground xl:hidden">Nhà trường</p>
                  <p className="line-clamp-2 break-words font-semibold text-foreground" title={row.school_name}>{row.school_name}</p>
                </td>
                <td className="min-w-0 align-middle xl:px-2 xl:py-3"><p className="mb-1 text-xs text-muted-foreground xl:hidden">Sales phụ trách</p>
                  <p className="line-clamp-2 break-words font-medium" title={row.owner_name}>{row.owner_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.personnel_type==='COLLABORATOR'?'CTV':'Nhân viên'}</p>
                </td>
                <td className="min-w-0 align-middle tabular-nums xl:px-2 xl:py-3"><p className="mb-1 text-xs text-muted-foreground xl:hidden">Kỳ sử dụng</p>
                  {row.service_until?channelDate(row.service_until):'—'}
                  {row.next_service_start_on&&<p className="mt-1 text-xs text-muted-foreground">
                    Kỳ tiếp theo: {channelDate(row.next_service_start_on)}</p>}
                </td>
                <td className="min-w-0 align-middle xl:px-2 xl:py-3"><p className="mb-1 text-xs text-muted-foreground xl:hidden">Dịch vụ</p>
                  <AppStatusBadge variant="kidsfit-service" status={state} label={label[state]??'Cần kiểm tra'} size="md"/>
                </td>
                <td className="min-w-0 align-middle xl:px-2 xl:py-3"><p className="mb-1 text-xs text-muted-foreground xl:hidden">Cần xử lý</p>
                  {row.action==='CONFIRM_RENEWAL'
                    ? <AppStatusBadge variant="kidsfit-action" status="CONFIRM_RENEWAL" label="Xác nhận tái ký"/>
                    :row.action==='REVIEW_PERIOD'
                      ? <AppStatusBadge variant="kidsfit-action" status="REVIEW_PERIOD" label="Kiểm tra kỳ dịch vụ"/>
                      :<span className="text-muted-foreground">—</span>}
                </td>
                <td className="min-w-0 align-middle tabular-nums xl:px-2 xl:py-3 xl:text-right"
                  aria-label={`Tổng thực thu của ${row.school_name}`}>
                  <p className="mb-1 text-xs text-muted-foreground xl:hidden">Tổng thực thu</p>
                  <p className="break-words font-semibold [overflow-wrap:anywhere]" title={channelMoney(row.received)}>{channelMoney(row.received)}</p>
                </td>
                <td className="min-w-0 align-middle tabular-nums xl:px-2 xl:py-3 xl:text-right">
                  <p className="mb-1 text-xs text-muted-foreground xl:hidden">Tổng hoa hồng</p>
                  <p className="break-words font-semibold [overflow-wrap:anywhere]" title={channelMoney(row.commission)}>{channelMoney(row.commission)}</p>
                </td>
                <td className="flex items-center justify-end align-middle xl:table-cell xl:px-1 xl:py-3 xl:text-center"><span className="mr-2 text-xs text-muted-foreground xl:hidden">Thao tác</span>
                  <AdminIconAction icon={Eye} onClick={()=>setSelected(row.id)}
                    label={`Xem chi tiết hợp đồng trường ${row.school_name}`}/>
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
    </AdminListPanel>}
    {accountingTab==='RECEIPTS'&&<AdminListPanel className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div><h2 className="text-base font-bold">Quản lý khoản thu nhà trường</h2>
          <p className="mt-1 text-xs text-muted-foreground">Ghi nhận tiền thực nhận, đối chiếu và lưu chứng từ theo hợp đồng.</p></div>
        {canRecordRevenue&&<Button type="button" size="sm" onClick={openReceiptForm}>
          <Plus className="size-4" aria-hidden="true"/> Thêm mới</Button>}
      </div>
      <form className="flex flex-wrap items-center gap-3 border-b border-border/80 px-5 py-4 sm:px-6"
        onSubmit={event=>{event.preventDefault();setReceiptAppliedSearch(receiptSearch.trim());setReceiptPage(1);}}>
        <div className="relative min-w-[210px] flex-[1_1_320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <Input aria-label="Tìm khoản thu" className="h-10 w-full rounded-lg pl-10"
            placeholder="Tên trường, hợp đồng, mã giao dịch..." value={receiptSearch} onChange={event=>setReceiptSearch(event.target.value)}/>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          Năm nhận tiền
          <Input type="number" min={2000} max={2100} className="h-10 w-32 rounded-lg"
            value={receiptYear==='ALL'?'':receiptYear} placeholder="Tất cả"
            onChange={event=>{setReceiptYear(event.target.value||'ALL');setReceiptPage(1);}}/>
        </label>
        <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
        <AppButton type="button" tone="outline" size="icon-lg" className="h-10 w-10 min-w-10 rounded-lg p-0"
          aria-label="Đặt lại bộ lọc khoản thu" title="Đặt lại bộ lọc"
          onClick={()=>{setReceiptSearch('');setReceiptAppliedSearch('');setReceiptYear('ALL');setReceiptPage(1);}}>
          <RotateCcw className="size-4" aria-hidden="true"/>
        </AppButton>
      </form>
      {receiptLoading?<output className="block p-5 text-sm text-muted-foreground">Đang tải các khoản thu...</output>:
      <div className="min-w-0">
        <table className="block w-full text-left text-sm xl:table xl:table-fixed">
          <thead className={adminTableHeadClass}>
            <tr>
              <th scope="col" className="w-[24%] px-3 py-3">Nhà trường / Hợp đồng</th>
              <th scope="col" className="w-[14%] px-2 py-3">Ngày thu</th>
              <th scope="col" className="w-[20%] px-2 py-3">Mã giao dịch</th>
              <th scope="col" className="w-[17%] px-2 py-3 text-right">Số tiền</th>
              <th scope="col" className="w-[16%] px-2 py-3">Trạng thái</th>
              <th scope="col" className="w-[9%] px-2 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {receiptRows.map(receipt=><tr key={receipt.id} className="even:bg-muted/20 hover:bg-muted/40">
              <td className="min-w-0 px-3 py-3">
                <p className="line-clamp-2 font-semibold" title={receipt.school_name}>{receipt.school_name}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{receipt.contract_code}</p>
              </td>
              <td className="tabular-nums px-2 py-3">{channelDate(receipt.received_at)}</td>
              <td className="min-w-0 break-all px-2 py-3">{receipt.reference_code}</td>
              <td className="font-semibold tabular-nums px-2 py-3 text-right">{channelMoney(receipt.amount)}</td>
              <td className="px-2 py-3"><AppStatusBadge status={receipt.status} tone="success" label="Đã ghi nhận" size="sm"/></td>
              <td className="px-2 py-3 text-center">
                <AdminIconAction icon={Eye} label={'Xem khoản thu '+receipt.reference_code} onClick={()=>setReceiptPreview(receipt)}/>
              </td>
            </tr>)}
            {receiptRows.length===0&&<tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
              Không có khoản thu phù hợp. Chọn Thêm mới để ghi nhận giao dịch ngân hàng đã xác minh.
            </td></tr>}
          </tbody>
        </table>
      </div>}
      <AppPagination page={receiptPage} pageSize={receiptPageSize} total={receiptTotal}
        itemLabel="khoản thu" disabled={receiptLoading} showSummary={false} pageSizeOptions={[10,20,50,100]}
        onPageChange={setReceiptPage} onPageSizeChange={size=>{setReceiptPageSize(size);setReceiptPage(1);}}/>
    </AdminListPanel>}
    {accountingTab==='PAYOUTS'&&<AdminListPanel>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <div><h2 className="text-base font-bold">Quản lý phiếu chi hoa hồng</h2>
          <p className="mt-1 text-xs text-muted-foreground">Lập phiếu theo trường, người hưởng và kỳ hoa hồng; gửi BGĐ duyệt trước khi chi.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreatePayout&&<Button type="button" size="sm"
            onClick={()=>{setPayoutPickerSearch('');setPayoutCandidateKey('');setPayoutPickerOpen(true);}}>
            <Plus className="size-4" aria-hidden="true"/> Lập phiếu chi
          </Button>}
          <span className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">{displayedPayouts.length} phiếu đang hiển thị · {financeOverview?.payout_total??displayedPayouts.length} phiếu trong kỳ</span>
        </div>
      </div>
      <AdminListToolbar search={financeSearch} onSearchChange={setFinanceSearch}
        onSearch={()=>{setFinanceAppliedSearch(financeSearch.trim());setFinancePage(1);}}
        onReset={resetFinanceFilters} searchLabel="Tìm người hưởng hoặc mã phiếu chi"
        placeholder="Tìm mã phiếu, người hưởng..."
        filters={<div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="accounting-finance-period">Kỳ hoa hồng</label>
          <Input id="accounting-finance-period" type="month" className="h-10 w-40 rounded-lg"
            value={financePeriod} onChange={event=>{setFinancePeriod(event.target.value);setFinancePage(1);}}/>
          <AppSelect ariaLabel="Lọc tổ chức phiếu chi" className="w-[160px]"
            value={financeOrganization}
            options={[{value:'ALL',label:'Tất cả tổ chức'},
              ...(financeOverview?.organizations??[]).map(org=>({value:String(org.id),label:org.name}))]}
            onValueChange={next=>{setFinanceOrganization(next);setFinancePage(1);}}/>
          <AppSelect ariaLabel="Lọc người hưởng hoa hồng" className="w-[166px]"
            value={financeRole}
            options={[{value:'ALL',label:'Sales và Quản lý'},{value:'SALES',label:'Sales'},{value:'MANAGER',label:'Quản lý'}]}
            onValueChange={next=>{setFinanceRole(next);setFinancePage(1);}}/>
          <AppSelect ariaLabel="Lọc trạng thái phiếu chi" className="w-[155px]"
            value={financeStatus}
            options={[{value:'ALL',label:'Tất cả'},
              {value:'DRAFT',label:'Nháp'},
              {value:'PENDING_APPROVAL',label:'Chờ BGĐ duyệt'},
              {value:'CHANGES_REQUESTED',label:'Cần bổ sung'},
              {value:'APPROVED',label:'Đã duyệt'},
              {value:'PAID',label:'Đã chi'},
              {value:'CANCELLED',label:'Đã hủy'},
              {value:'REJECTED',label:'Đã từ chối'}]}
            onValueChange={next=>{setFinanceStatus(next);setFinancePage(1);}}/>
        </div>}/>
      <div className="px-5 py-4 sm:px-6">
        <h3 className="text-sm font-bold">Danh sách phiếu chi</h3>
        <p className="mt-1 text-xs text-muted-foreground">Xem hồ sơ, sửa nháp, gửi BGĐ duyệt và ghi nhận chi theo quyền.</p>
      </div>
      <div className="overflow-x-auto">
        <table className={adminTableClass}>
          <thead className={adminTableHeadClass}>
            <tr>
              <th scope="col" className="px-4 py-3">Mã phiếu / Người hưởng</th>
              <th scope="col" className="px-3 py-3">Trường / Hợp đồng</th>
              <th scope="col" className="px-3 py-3 text-right">Số tiền phiếu</th>
              <th scope="col" className="px-3 py-3">Trạng thái</th>
              <th scope="col" className="px-3 py-3">Kỳ</th>
              <th scope="col" className="px-3 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {visiblePayouts.map(p=><tr key={p.id} className="transition-colors even:bg-muted/20 hover:bg-accent">
              <td className="min-w-0 px-4 py-3">
                <p className="max-w-[200px] truncate font-semibold" title={p.code}>{p.code}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{p.beneficiary_name} · {p.beneficiary_role==='MANAGER'?'Quản lý':'Sales'}</p>
              </td>
              <td className="min-w-0 px-3 py-3">
                <p className="max-w-[230px] break-words text-xs font-medium">{p.school_names?.length?p.school_names.join(', '):'Không xác định trường'}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{p.contract_codes?.length?p.contract_codes.join(', '):'Chưa có mã hợp đồng'}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{channelMoney(p.net_amount)}</td>
              <td className="px-3 py-3">
                <AppStatusBadge size="sm" status={p.status} label={payoutStatusLabel(p.status)}
                  tone={p.status==='PAID'||p.status==='APPROVED'?'success'
                    :p.status==='REJECTED'||p.status==='CANCELLED'?'danger'
                    :p.status==='CHANGES_REQUESTED'||p.status==='PENDING_APPROVAL'?'warning':'neutral'}/>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs">{payoutPeriodLabel(p.period)}</td>
              <td className="px-3 py-3 text-center">
                <Button type="button" size="sm" variant="outline" onClick={()=>setPayoutPreview(p)}
                  aria-label={`Xem và xử lý phiếu chi ${p.code}`}>
                  <Eye className="size-4" aria-hidden="true"/> Xem
                </Button>
              </td>
            </tr>)}
            {!visiblePayouts.length&&<tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
              {financeLoading?'Đang tải danh sách phiếu chi...':!connected?'Cần đăng nhập để xem phiếu chi.':'Không có phiếu chi phù hợp với bộ lọc.'}
            </td></tr>}
          </tbody>
        </table>
      </div>
      {(financeOverview?.payout_total??0)>100&&<output className="block px-5 py-2 text-xs text-amber-700 dark:text-amber-300">Danh sách kỳ này có {financeOverview?.payout_total} phiếu nhưng API hiện trả tối đa 100 phiếu. Không dùng danh sách này để kết luận đã xem toàn bộ kỳ.</output>}
      <AppPagination page={financePage} pageSize={financePageSize} total={displayedPayouts.length}
        itemLabel="phiếu chi" disabled={financeLoading} showSummary={false}
        pageSizeOptions={[10,20,50,100]}
        onPageChange={setFinancePage}
        onPageSizeChange={size=>{setFinancePageSize(size);setFinancePage(1);}}/>
    </AdminListPanel>}
    <AppDialog open={receiptIntent} onOpenChange={open=>{if(!open){setReceiptIntent(false);setSelected(null);}}}
      title="Thêm khoản thu từ nhà trường" description="Bước 1: Chọn trường có đợt thanh toán chưa hoàn tất; bước 2: nhập giao dịch và tải chứng từ.">
      <div className="space-y-4">
        <label htmlFor="receivable-contract-search" className="block space-y-1 text-sm font-medium">
          <span>Tìm nhà trường / Hợp đồng</span>
          <Input id="receivable-contract-search" value={receivableSearch} placeholder="Tìm tên trường hoặc mã hợp đồng..."
            onChange={event=>{setReceivableSearch(event.target.value);setReceivablePage(1);}}/>
        </label>
        {receivableLoading?<output className="block p-3 text-sm text-muted-foreground">Đang tìm hợp đồng...</output>
          :receivableRows.length===0?<p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Không có hợp đồng còn phải thu trong phạm vi được phép.</p>:
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {receivableRows.map(item=><button type="button" key={item.id}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-left hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
              onClick={()=>setSelected(item.id)}>
              <span className="min-w-0">
                <span className="block break-words text-sm font-semibold">{item.school_name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{item.code}</span>
              </span>
              <span className="shrink-0 text-right text-xs font-semibold text-primary tabular-nums">{channelMoney(item.amount_remaining)}</span>
            </button>)}
          </div>}
        {receivableTotal>50&&<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Trang {receivablePage} / {Math.ceil(receivableTotal/50)}</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={receivablePage<=1||receivableLoading}
              onClick={()=>setReceivablePage(v=>v-1)}>Trước</Button>
            <Button type="button" size="sm" variant="outline"
              disabled={receivablePage*50>=receivableTotal||receivableLoading}
              onClick={()=>setReceivablePage(v=>v+1)}>Sau</Button>
          </div>
        </div>}
        <div className="flex justify-end border-t border-border pt-3">
          <Button type="button" variant="outline" onClick={()=>{setReceiptIntent(false);setSelected(null);}}>Hủy</Button>
        </div>
      </div>
    </AppDialog>
    <AppDialog open={receiptPreview!==null} onOpenChange={open=>{if(!open)setReceiptPreview(null);}}
      title="Chi tiết khoản thu" description="Khoản thu đã ghi nhận không được sửa/xóa trực tiếp vì có thể phát sinh hoa hồng.">
      {receiptPreview&&<div className="space-y-4 text-sm">
        <dl className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Nhà trường</dt><dd className="mt-1 font-semibold">{receiptPreview.school_name}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Mã hợp đồng</dt><dd className="mt-1 break-all">{receiptPreview.contract_code}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Ngày nhận</dt><dd className="mt-1">{channelDate(receiptPreview.received_at)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Mã giao dịch</dt><dd className="mt-1 break-all">{receiptPreview.reference_code}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Tổng tiền đã nhận</dt><dd className="mt-1 font-bold tabular-nums text-primary">{channelMoney(receiptPreview.amount)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Trạng thái</dt><dd className="mt-1">Đã ghi nhận</dd></div>
        </dl>
        <div className="flex justify-end gap-2">
          {receiptPreview.proof_id&&receiptPreview.proof_file_name&&<Button type="button" variant="outline"
            onClick={()=>void viewEvidence(receiptPreview.proof_id!,receiptPreview.proof_file_name!)}>
            <ImageIcon className="size-4" aria-hidden="true"/> Xem chứng từ
          </Button>}
          <Button type="button" onClick={()=>{setSelected(receiptPreview.contract_id);setAccountingTab('CONTRACTS');setReceiptPreview(null);}}>
            <FileCheck2 className="size-4" aria-hidden="true"/> Xem hợp đồng
          </Button>
        </div>
      </div>}
    </AppDialog>
    <AppDialog open={payoutPickerOpen} onOpenChange={open=>{if(!saving)setPayoutPickerOpen(open);}}
      title="Lập phiếu chi hoa hồng" description="Chọn kỳ, nhà trường và người hưởng có hoa hồng đủ điều kiện. Sau đó kiểm tra số tiền trong form Nháp.">
      <div className="space-y-4">
        <label htmlFor="accounting-payout-month" className="block space-y-1 text-sm font-medium">
          <span>Kỳ hoa hồng *</span>
          <Input id="accounting-payout-month" type="month" value={financePeriod}
            onChange={event=>{setFinancePeriod(event.target.value);setPayoutCandidateKey('');}}/>
        </label>
        <label htmlFor="accounting-payout-search" className="block space-y-1 text-sm font-medium">
          <span>Tìm nhà trường / hợp đồng</span>
          <Input id="accounting-payout-search" value={payoutPickerSearch}
            onChange={event=>{setPayoutPickerSearch(event.target.value);setPayoutCandidateKey('');}}
            placeholder="Nhập tên trường, mã hợp đồng hoặc người hưởng"/>
        </label>
        <label htmlFor="accounting-payout-candidate" className="block space-y-1 text-sm font-medium">
          <span>Nhà trường và người hưởng *</span>
          <select id="accounting-payout-candidate" value={payoutCandidateKey}
            onChange={event=>setPayoutCandidateKey(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">Chọn khoản hoa hồng chưa lập phiếu</option>
            {payoutChoices.map(item=><option key={candidateKey(item)} value={candidateKey(item)}>
              {item.school_name} · {item.beneficiary_role==='MANAGER'?'Quản lý':'Sales'}: {item.beneficiary_name} · {channelMoney(item.amount)}
            </option>)}
          </select>
        </label>
        {financeLoading?<output className="block text-xs text-muted-foreground">Đang tải khoản hoa hồng...</output>
          :payoutChoices.length===0?<p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Chưa có hoa hồng đủ điều kiện ở kỳ hoặc bộ lọc này.</p>:null}
        {chosenCandidate&&<div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold">{chosenCandidate.school_name}</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">{chosenCandidate.contract_code} · {chosenCandidate.beneficiary_name}</p>
          <p className="mt-2 text-lg font-bold text-primary tabular-nums">Hoa hồng đề xuất: {channelMoney(chosenCandidate.amount)}</p>
        </div>}
        {(financeOverview?.eligible_payout_total??0)>100&&<p className="text-xs text-amber-700 dark:text-amber-300">
          Kỳ này có hơn 100 lựa chọn; hệ thống mới tải 100 khoản đầu. Không nên lập phiếu từ dữ liệu chưa hiển thị.
        </p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={()=>setPayoutPickerOpen(false)}>Hủy</Button>
          <Button type="button" disabled={!chosenCandidate||financeLoading||saving}
            onClick={()=>{
              if(!chosenCandidate)return;
              setPayoutPickerOpen(false);
              openCentralPayout({contractId:chosenCandidate.contract_id,beneficiaryUserId:chosenCandidate.beneficiary_user_id,
                role:chosenCandidate.beneficiary_role,period:chosenCandidate.period,mode:'CREATE'});
            }}>Tiếp tục lập phiếu</Button>
        </div>
      </div>
    </AppDialog>
    <AppDialog open={payoutPreview!==null}
      onOpenChange={open=>{if(!open)setPayoutPreview(null);}}
      title={payoutPreview?'Phiếu chi · '+payoutPreview.code:'Chi tiết phiếu chi'}
      description="Kiểm tra nguồn hoa hồng và lịch sử trước khi thao tác. Các chức năng chỉ xuất hiện theo quyền.">
      {payoutPreview&&<div className="space-y-4 text-sm">
        <div className="grid gap-3 rounded-xl border border-border/80 bg-muted/20 p-4 sm:grid-cols-2">
          <div><p className="text-xs text-muted-foreground">Người hưởng</p>
            <p className="mt-1 font-semibold">{payoutPreview.beneficiary_name} · {payoutPreview.beneficiary_role==='MANAGER'?'Quản lý':'Sales'}</p>
          </div>
          <div><p className="text-xs text-muted-foreground">Kỳ hoa hồng</p>
            <p className="mt-1 font-medium">{payoutPeriodLabel(payoutPreview.period)}</p>
          </div>
          <div><p className="text-xs text-muted-foreground">Trường / Hợp đồng</p>
            <p className="mt-1 break-words font-medium">{payoutPreview.school_names?.join(', ')||'Chưa xác định'}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">{payoutPreview.contract_codes?.join(', ')||'Không có mã hợp đồng'}</p>
          </div>
          <div><p className="text-xs text-muted-foreground">Trạng thái phiếu</p>
            <p className="mt-1 font-semibold">{payoutStatusLabel(payoutPreview.status)}</p>
          </div>
          <div><p className="text-xs text-muted-foreground">Đề nghị chi</p>
            <p className="mt-1 font-semibold tabular-nums">{channelMoney(payoutPreview.requested_amount)}</p>
            <p className="text-xs text-muted-foreground">Theo hệ thống: {channelMoney(payoutPreview.suggested_amount)}</p>
          </div>
          <div><p className="text-xs text-muted-foreground">{payoutPreview.status==='PAID'?'Thực chi':'Số tiền sau khấu trừ'}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-primary">{channelMoney(payoutPreview.net_amount)}</p>
            <p className="text-xs text-muted-foreground">Khấu trừ: {channelMoney(payoutPreview.withholding_amount)}</p>
          </div>
          {payoutPreview.paid_at&&<div><p className="text-xs text-muted-foreground">Ngày chuyển khoản</p>
            <p className="mt-1 font-medium">{channelDate(payoutPreview.paid_at)}</p></div>}
          {payoutPreview.payment_reference&&<div><p className="text-xs text-muted-foreground">Mã giao dịch</p>
            <p className="mt-1 break-all font-medium">{payoutPreview.payment_reference}</p></div>}
          {payoutPreview.adjustment_reason&&<div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Lý do điều chỉnh</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{payoutPreview.adjustment_reason}</p></div>}
          {payoutPreview.withholding_reason&&<div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Lý do khấu trừ</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{payoutPreview.withholding_reason}</p></div>}
        </div>
        <section className="space-y-2" aria-label="Lịch sử xử lý phiếu chi">
          <h3 className="font-semibold">Lịch sử xử lý</h3>
          {payoutPreview.events.length===0?<p className="text-xs text-muted-foreground">Chưa có lịch sử xử lý.</p>:
            payoutPreview.events.map((event,index)=><div key={index} className="border-l-2 border-border pl-3 text-xs">
              <p className="font-semibold">{payoutEventLabel(event.event_type)}</p>
              <p className="mt-1 text-muted-foreground">{channelDate(event.created_at)}</p>
              {event.reason&&<p className="mt-1 whitespace-pre-wrap break-words">{event.reason}</p>}
            </div>)}
        </section>
        {payoutPreview.contract_ids?.length!==1&&<p className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Phiếu lịch sử liên quan nhiều hợp đồng hoặc chưa xác định nguồn. Không thể tự chọn một trường để sửa hay chuyển khoản.
        </p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          {payoutPreview.proof_id&&payoutPreview.proof_file_name&&<Button type="button" size="sm" variant="outline"
            onClick={()=>void viewEvidence(payoutPreview.proof_id!,payoutPreview.proof_file_name!)}>
            <ImageIcon className="size-4" aria-hidden="true"/> Xem chứng từ chi
          </Button>}
          {payoutPreview.contract_ids?.length===1&&<Button type="button" size="sm" variant="outline"
            onClick={()=>{setSelected(payoutPreview.contract_ids![0]);setAccountingTab('CONTRACTS');setPayoutPreview(null);}}>
            <FileCheck2 className="size-4" aria-hidden="true"/> Xem hợp đồng
          </Button>}
          {(payoutPreview.status==='DRAFT'||payoutPreview.status==='CHANGES_REQUESTED')&&canCreatePayout
            &&payoutPreview.contract_ids?.length===1&&<Button type="button" size="sm" variant="outline" disabled={saving}
              onClick={()=>openCentralPayout({contractId:payoutPreview.contract_ids![0],beneficiaryUserId:payoutPreview.beneficiary_user_id,
                role:payoutPreview.beneficiary_role,period:payoutPreview.period,mode:'EDIT',payoutId:payoutPreview.id})}>
              <Pencil className="size-4" aria-hidden="true"/> Sửa phiếu
            </Button>}
          {(payoutPreview.status==='DRAFT'||payoutPreview.status==='CHANGES_REQUESTED')&&canCreatePayout
            &&<Button type="button" size="sm" disabled={saving}
              onClick={()=>{const id=payoutPreview.id;setPayoutPreview(null);void submitPayout(id);}}>
              <Send className="size-4" aria-hidden="true"/> Gửi BGĐ duyệt
            </Button>}
          {payoutPreview.status==='PENDING_APPROVAL'&&canApprovePayout&&<>
            <Button type="button" size="sm" variant="outline" disabled={saving}
              onClick={()=>{setReturningPayoutId(payoutPreview.id);setPayoutPreview(null);}}>Yêu cầu bổ sung</Button>
            <Button type="button" size="sm" disabled={saving}
              onClick={()=>{const id=payoutPreview.id;setPayoutPreview(null);void approvePayout(id);}}>Duyệt phiếu</Button>
          </>}
          {payoutPreview.status==='APPROVED'&&canCompletePayout&&payoutPreview.contract_ids?.length===1&&
            <Button type="button" size="sm" disabled={saving}
              onClick={()=>openCentralPayout({contractId:payoutPreview.contract_ids![0],
                beneficiaryUserId:payoutPreview.beneficiary_user_id,role:payoutPreview.beneficiary_role,
                period:payoutPreview.period,mode:'COMPLETE',payoutId:payoutPreview.id})}>
              <WalletCards className="size-4" aria-hidden="true"/> Ghi nhận chuyển khoản
            </Button>}
        </div>
      </div>}
    </AppDialog>
    <AppDrawer wide compactAccountingHeader open={selected !== null && accountingTab==='CONTRACTS'} onOpenChange={open => { if (!open) {setSelected(null);setEntryMode(null);closePreview();} }}
      title={rows.find(r=>r.id===selected)?.school_name??'Chi tiết hợp đồng'}
      description="Kế toán / Chi tiết hợp đồng">
      {!detail ? <output className="block space-y-3 p-3" aria-label="Đang tải chi tiết hợp đồng"><AppSkeleton className="h-6 w-2/3"/><AppSkeleton className="h-20 w-full"/><AppSkeleton className="h-28 w-full"/></output> : <div className="space-y-5 text-sm">
        <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5">
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
          return <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
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
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-bold text-foreground">Thông tin hợp đồng gốc</h3><span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary">{detail.school_units.length} điểm triển khai</span></div>
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
          <details className="group rounded-xl border border-border/80 bg-muted/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <span>Trường điểm / Phân hiệu ({detail.school_units.length})</span>
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">Xem danh sách</span>
              <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Thu gọn</span>
            </summary>
            <div className="border-t border-border/70 px-4 py-3">
              {detail.school_units.length>0?<ul className="grid gap-2 sm:grid-cols-2">{detail.school_units.map(unit=><li key={unit.id} className="min-w-0 rounded-lg bg-background px-3 py-2 text-sm font-medium break-words">{unit.name}</li>)}</ul>:<p className="text-sm text-muted-foreground">Chỉ có trường chính, không có trường điểm / phân hiệu.</p>}
            </div>
          </details>
          </section>
        <section className="space-y-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-bold">Lịch thanh toán theo hợp đồng</h3>
          {detail.schedules.length===0 && <p className="text-muted-foreground">Chưa có lịch thanh toán.</p>}
          <div className="divide-y divide-border/70 rounded-lg border border-border/70">
            {(showAllSchedules?orderedSchedules:orderedSchedules.slice(0,6)).map(x=>{
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
          {detail.schedules.length>6&&<Button type="button" variant="outline" size="sm" className="w-full" onClick={()=>setShowAllSchedules(value=>!value)}>{showAllSchedules?`Thu gọn lịch thanh toán`:`Xem toàn bộ ${detail.schedules.length} đợt thanh toán`}</Button>}
        </section>
        <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground">Nhà trường thanh toán</h3>
            {canRecordRevenue && detail.data.status==='ACTIVE' && <Button size="sm" disabled={saving || !detail.schedules.some(x=>x.amount_received<x.amount_due)}
              onClick={()=>{setAccountingTab('RECEIPTS');openReceiptForm();}}><Plus className="size-4"/> Thêm khoản thu</Button>}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="space-y-1 text-xs font-medium">Năm nhận tiền
              <select className="mt-1 block h-10 min-w-40 rounded-lg border border-input bg-background px-3 text-sm text-foreground" value={receiptHistoryYear} onChange={e=>{setReceiptHistoryYear(e.target.value);setReceiptHistoryPage(1);}}><option value="ALL">Tất cả các năm</option>{receiptYears.map(year=><option key={year} value={year}>{year}</option>)}</select>
            </label>
            <p className="text-xs text-muted-foreground">{filteredReceipts.length}/{detail.receipts.length} khoản thu</p>
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
                {filteredReceipts.length===0 ? <tr><td colSpan={4} className="px-3 py-7 text-center text-muted-foreground">Không có khoản thu phù hợp.</td></tr>
                  : visibleReceipts.map(x=>{
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
          {filteredReceipts.length>10&&<div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Trang {effectiveReceiptPage}/{receiptPageCount}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={effectiveReceiptPage<=1} onClick={()=>setReceiptHistoryPage(effectiveReceiptPage-1)}>Trước</Button><Button type="button" variant="outline" size="sm" disabled={effectiveReceiptPage>=receiptPageCount} onClick={()=>setReceiptHistoryPage(effectiveReceiptPage+1)}>Sau</Button></div></div>}
        </section>
        <section ref={payoutSectionRef} tabIndex={-1} aria-labelledby="contract-commission-heading"
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
            {canCreatePayout&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div><p className="font-semibold">Quản lý phiếu chi tập trung</p>
                <p className="mt-1 text-xs text-muted-foreground">Lập, sửa và gửi duyệt phiếu tại tab Phiếu chi hoa hồng để tránh thao tác trùng.</p>
              </div>
              <Button type="button" size="sm" onClick={()=>{setFinancePeriod(chosenPeriod||financePeriod);setFinancePage(1);setAccountingTab('PAYOUTS');setSelected(null);}}>
                <WalletCards className="size-4" aria-hidden="true"/> Đến phiếu chi hoa hồng
              </Button>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h4 className="text-sm font-semibold text-foreground">Lịch sử phiếu chi liên quan</h4>
                <p className="mt-1 text-xs text-muted-foreground">Chỉ tra cứu tại hợp đồng; thao tác ở tab Phiếu chi hoa hồng.</p></div>
              <span className="text-xs text-muted-foreground">{payoutFiltered.length}/{detail.payouts.length} phiếu</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-medium">Năm kỳ hoa hồng
                <select className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={payoutHistoryYear} onChange={e=>{setPayoutHistoryYear(e.target.value);setPayoutHistoryPage(1);}}>
                  <option value="ALL">Tất cả các năm</option>{payoutYears.map(year=><option key={year} value={year}>{year}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium">Trạng thái
                <select className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={payoutHistoryStatus} onChange={e=>{setPayoutHistoryStatus(e.target.value);setPayoutHistoryPage(1);}}>
                  <option value="ALL">Tất cả trạng thái</option>{["DRAFT","CHANGES_REQUESTED","PENDING_APPROVAL","APPROVED","PAID","CANCELLED","REJECTED"].map(status=><option key={status} value={status}>{payoutStatusLabel(status)}</option>)}
                </select>
              </label>
            </div>
            <div className="space-y-2">
              {payoutVisible.length===0&&<div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-xs text-muted-foreground">
                Chưa có phiếu chi phù hợp với bộ lọc.
              </div>}
              {payoutVisible.map(x=><div key={x.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="break-all text-xs font-semibold">{x.code}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{x.beneficiary_role==='MANAGER'?'Quản lý':'Sales'} · {detail.ledger.find(e=>e.beneficiary_user_id===x.beneficiary_user_id)?.beneficiary_name??'—'} · {payoutPeriodLabel(x.period)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{payoutStatusLabel(x.status)}{x.paid_at?' · Đã chuyển '+channelDate(x.paid_at):''}</p>
                </div>
                <p className="font-bold tabular-nums">{channelMoney(x.net_amount)}</p>
              </div>)}
            </div>
          {payoutFiltered.length>10&&<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Trang {effectivePayoutPage}/{payoutPageCount} · {payoutFiltered.length} phiếu</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={effectivePayoutPage<=1} onClick={()=>setPayoutHistoryPage(effectivePayoutPage-1)}>Trước</Button><Button type="button" variant="outline" size="sm" disabled={effectivePayoutPage>=payoutPageCount} onClick={()=>setPayoutHistoryPage(effectivePayoutPage+1)}>Sau</Button></div></div>}
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
    <AppDialog returnFocusRef={accountingTab==='CONTRACTS'?payoutSectionRef:undefined} open={Boolean(detail&&payoutDialogOpen)}
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
          <Button type="submit" className="w-full sm:w-auto" disabled={saving||(!editingPayout&&!chosenPeriod)}>
            {saving?'Đang lưu...':'Lưu nháp'}
          </Button>
        </div>
      </form>}
    </AppDialog>
    <AppDialog open={Boolean(detail && entryMode)} onOpenChange={open=>{if(!open && !saving){setEntryMode(null);receiptAttempt.current=null;}}}
      busy={saving} title={entryMode==='receipt'?'Thêm khoản thu từ nhà trường':'Ghi nhận chuyển khoản phiếu chi'}
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
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
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
            }} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
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
        <div className="flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
          <AppButton type="button" tone="neutral" disabled={saving} onClick={()=>setEntryMode(null)}>Hủy</AppButton>
          <AppButton type="submit" tone="green" busy={saving}>{saving?'Đang lưu...':entryMode==='receipt'?'Ghi nhận khoản thu':'Xác nhận đã chuyển tiền'}</AppButton>
        </div>
      </form>}
    </AppDialog>
    <EvidencePreviewDialog preview={preview} onClose={closePreview}/>
  </div>;
}

function Metric({ label, value }: {label:string;value:string}) {
  return <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold tabular-nums tracking-tight">{value}</p></div>;
}
