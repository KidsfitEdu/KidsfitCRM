'use client';

import { accountingTransactionTimestamp, contractSignedDay, validateTransactionDay } from '@/lib/accounting-transaction-date';
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { AlertCircle, ArrowRight, ClipboardCheck, Eye, FileCheck2, HandCoins, Image as ImageIcon, MessageSquareText, Pencil, Plus, RotateCcw, Search, Send, SlidersHorizontal, UserRound, WalletCards } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { appNotice } from '@/components/common/app-toast-provider';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { AppPagination } from '@/components/common/app-pagination';
import { AppPageHeader } from '@/components/common/app-page-header';
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
import { AccountingContractDetailContent } from './AccountingContractDetailContent';
import { AccountingContractTreeTable } from './AccountingContractTreeTable';
import { AppDatePicker } from '@/components/common/forms/app-date-picker';

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
export type ContractRow = {
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
  source_service_start_on?:string|null;source_service_end_on?:string|null;
  periods?:{id:number;renewal_no:number;status:string;service_start_on:string;service_end_on:string;total_value:number;
    contract_code:string|null;signed_on:string;payment_cycle:string;received:number;commission:number}[];
};
type ContractList = { data: ContractRow[]; owners?: { id: number; name: string }[] | null; total: number; page: number; page_size: number };
type ReceiptRow = {
  id:number;contract_id:number;contract_code:string;school_name:string;
  amount:number;received_at:string;reference_code:string;payment_method:string;
  status:string;schedule_id:number|null;proof_id:number|null;proof_file_name:string|null;
};
type ReceiptList = {data:ReceiptRow[];total:number;page:number;page_size:number};
type ReceivableContract={id:number;code:string;school_name:string;amount_remaining:number;
  owner_name:string;personnel_type:string|null;manager_name:string|null};
type ReceivableList={data:ReceivableContract[];total:number;page:number;page_size:number};
type PayoutRow=FinanceWorkspace['payouts'][number]&{
  can_edit:boolean;can_submit:boolean;can_approve:boolean;can_complete:boolean;
};
type PayoutRegister={
  data:PayoutRow[];total:number;page:number;page_size:number;
  organizations:FinanceWorkspace['organizations'];
};
type EligibleRow=NonNullable<FinanceWorkspace['eligible_payouts']>[number];
type EligibleRegister={data:EligibleRow[];total:number;page:number;page_size:number};
type BackfillPreview={
  receipt_id:number;contract_id:number;eligible_cash:number;
  sales_user_id:number;manager_user_id:number|null;manager_name:string|null;
  manager_review_required:boolean;requires_manager_verification:boolean;
  sales_percent:number;manager_percent:number;
  sales_amount:number;manager_amount:number;
  policy_source:string;board_policy_version_id:number|null;
  has_existing_ledger:boolean;can_apply:boolean;
};
export type Detail = {
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
  schedules: { id: number; due_on: string; amount_due: number; amount_received: number; status: string; renewal_no?: number|null; contract_renewal_id?: number|null; renewal_signed_on?: string|null }[];
  refunded_total: number;
  receipts: { id: number; revenue_schedule_id:number|null; received_at: string; amount: number; reference_code: string; payment_method: string }[];
  ledger: { id: number; entry_type: string; amount: number; rate_percent: number; calculation_base:number;
    reason: string | null; occurred_at: string;
    period: string; beneficiary_user_id: number; beneficiary_name: string; beneficiary_organization_id: number;
    revenue_receipt_id:number|null;
    beneficiary_role: 'SALES'|'MANAGER'; policy_source: string; board_policy_version_id: number|null;
    assigned_to_payout: boolean;payout_id?:number|null }[];
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
  const [needsAction,setNeedsAction]=useState('ALL');
  const [serviceFrom,setServiceFrom]=useState('');
  const [serviceTo,setServiceTo]=useState('');
  const [appliedServiceFrom,setAppliedServiceFrom]=useState('');
  const [appliedServiceTo,setAppliedServiceTo]=useState('');
  const [dateRangeError,setDateRangeError]=useState('');
  const [selectedPeriodId,setSelectedPeriodId]=useState<number|null>(null);
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
  const [receiptMonth,setReceiptMonth]=useState('ALL');
  const [receiptAppliedMonth,setReceiptAppliedMonth]=useState('ALL');
  const [receiptAppliedYear,setReceiptAppliedYear]=useState('ALL');
  const [receiptLoading,setReceiptLoading]=useState(false);
  const [receiptRevision,setReceiptRevision]=useState(0);
  const [receiptPreview,setReceiptPreview]=useState<ReceiptRow|null>(null);
  const [transactionDate,setTransactionDate]=useState(()=>accountingBusinessDay(new Date()));
  const [transactionReference,setTransactionReference]=useState('');
  const [receivableSearch,setReceivableSearch]=useState('');
  const [receivablePage,setReceivablePage]=useState(1);
  const [receivableRows,setReceivableRows]=useState<ReceivableContract[]>([]);
  const [receivableTotal,setReceivableTotal]=useState(0);
  const [receivableLoading,setReceivableLoading]=useState(false);
  const [receivableChoice,setReceivableChoice]=useState<ReceivableContract|null>(null);
  const [receivablePickerOpen,setReceivablePickerOpen]=useState(false);
  const [receiptNoDue,setReceiptNoDue]=useState(false);
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
  const [financeAdvancedOpen,setFinanceAdvancedOpen]=useState(false);
  const [payoutRows,setPayoutRows]=useState<PayoutRow[]>([]);
  const [payoutTotal,setPayoutTotal]=useState(0);
  const [payoutOrganizations,setPayoutOrganizations]=useState<FinanceWorkspace['organizations']>([]);
  const [eligibleRows,setEligibleRows]=useState<EligibleRow[]>([]);
  const [eligibleTotal,setEligibleTotal]=useState(0);
  const [eligiblePage,setEligiblePage]=useState(1);
  const [eligibleLoading,setEligibleLoading]=useState(false);
  const [payoutPickerOpen,setPayoutPickerOpen]=useState(false);
  const [payoutPickerSearch,setPayoutPickerSearch]=useState('');
  const [payoutCandidateKey,setPayoutCandidateKey]=useState('');
  const [payoutPreview,setPayoutPreview]=useState<PayoutRow|null>(null);
  const [centralPayoutIntent,setCentralPayoutIntent]=useState<{
    contractId:number;beneficiaryUserId:number;role:'SALES'|'MANAGER';period:string;
    mode:'CREATE'|'EDIT'|'COMPLETE';payoutId?:number;
  }|null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [focusedRenewal,setFocusedRenewal]=useState<{id:number;action:'view'|'confirm'|'request-info'}|null>(null);
  const openContract=(id:number,renewalId:number|null=null)=>{
    setFocusedRenewal(null);setSelectedPeriodId(renewalId);setSelected(id);
  };
  const openRenewal=(contractId:number,renewalId:number,action:'view'|'confirm'|'request-info')=>{
    setSelectedPeriodId(renewalId);setFocusedRenewal({id:renewalId,action});setSelected(contractId);
  };
  const [detail, setDetail] = useState<Detail | null>(null);
  const [giHistory,setGiHistory]=useState<{status:string;gap_start_on:string;threshold_on:string;processed_at:string;reason:string}[]>([]);
  const [detailRevision, setDetailRevision] = useState(0);
  const loadedContractId = useRef<number | null>(null);

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
  const canCreatePayout = abilities.includes('channel_sales.payout.create') || abilities.includes('*');
  const canAdjustCommission=abilities.includes('channel_sales.commission.adjust')||abilities.includes('*');
  const canView = abilities.includes('channel_sales.commission.view') || abilities.includes('*');
  const connected = Boolean(apiBase && token && canView);
  const load = useCallback(async () => {
    if (!connected) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({page:String(page),page_size:String(pageSize),status:'ALL'});
      if(appliedServiceFrom)params.set('service_from',appliedServiceFrom);
      if(appliedServiceTo)params.set('service_to',appliedServiceTo);
      if(needsAction!=='ALL')params.set('needs_action','true');
      if (appliedSearch.trim()) params.set('search', appliedSearch.trim());
      const result = await channelRequest<ContractList>(apiBase, token, `/accounting/workspace?${params.toString()}`);
      setRows(result.data);
      setTotal(result.total);
    } catch (cause) {
      // Preserve the current rows on transient failures so the list does not flash empty.
      appNotice.error('Không tải được danh sách hợp đồng.', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  }, [apiBase,token,page,pageSize,appliedSearch,appliedServiceFrom,appliedServiceTo,needsAction,connected]);
  useEffect(() => { void load(); }, [load]);
  useEffect(()=>{
    if(!connected||accountingTab!=='PAYOUTS')return;
    let active=true;
    setFinanceLoading(true);
    const params=new URLSearchParams({period:financePeriod,
      page:String(financePage),page_size:String(financePageSize)});
    if(financeAppliedSearch)params.set('search',financeAppliedSearch);
    if(financeStatus!=='ALL')params.set('status',financeStatus);
    if(financeRole!=='ALL')params.set('role',financeRole);
    if(financeOrganization!=='ALL')params.set('organization_id',financeOrganization);
    void channelRequest<PayoutRegister>(apiBase,token,'/accounting/payouts?'+params)
      .then(value=>{if(active){
        setPayoutRows(value.data);setPayoutTotal(value.total);
        setPayoutOrganizations(value.organizations);
      }})
      .catch(cause=>{if(active)appNotice.error('Không tải được danh sách phiếu chi.',
        cause instanceof Error?cause.message:'Vui lòng thử lại.');})
      .finally(()=>{if(active)setFinanceLoading(false);});
    return()=>{active=false;};
  },[apiBase,token,connected,accountingTab,financePeriod,financePage,
    financePageSize,financeAppliedSearch,financeStatus,financeRole,financeOrganization,detailRevision]);

  useEffect(()=>{
    if(!connected||!canCreatePayout||accountingTab!=='PAYOUTS'||!payoutPickerOpen)return;
    let active=true;setEligibleLoading(true);
    const params=new URLSearchParams({period:financePeriod,page:String(eligiblePage),page_size:'20'});
    if(payoutPickerSearch.trim())params.set('search',payoutPickerSearch.trim());
    if(financeRole!=='ALL')params.set('role',financeRole);
    if(financeOrganization!=='ALL')params.set('organization_id',financeOrganization);
    void channelRequest<EligibleRegister>(apiBase,token,'/accounting/eligible-payouts?'+params)
      .then(res=>{if(active){setEligibleRows(res.data);setEligibleTotal(res.total);}})
      .catch(cause=>{if(active)appNotice.error('Không tải được khoản hoa hồng đủ điều kiện.',
        cause instanceof Error?cause.message:'Vui lòng thử lại.');})
      .finally(()=>{if(active)setEligibleLoading(false);});
    return()=>{active=false;};
  },[apiBase,token,connected,canCreatePayout,accountingTab,financePeriod,
    payoutPickerOpen,payoutPickerSearch,eligiblePage,financeRole,financeOrganization,detailRevision]);

  useEffect(()=>{
    if(!connected||accountingTab!=='RECEIPTS')return;
    let active=true;
    setReceiptLoading(true);
    const params=new URLSearchParams({page:String(receiptPage),page_size:String(receiptPageSize)});
    if(receiptAppliedSearch)params.set('search',receiptAppliedSearch);
    if(receiptAppliedYear!=='ALL')params.set('year',receiptAppliedYear);
    if(receiptAppliedMonth!=='ALL')params.set('month',receiptAppliedMonth);
    const loadRows=channelRequest<ReceiptList>(apiBase,token,'/accounting/receipts?'+params);
    void loadRows.then(res=>{if(active){setReceiptRows(res.data);setReceiptTotal(res.total);}})
      .catch(error=>{if(active)appNotice.error('Không tải được khoản thu.',
        error instanceof Error?error.message:'Thử lại sau.');})
      .finally(()=>{if(active)setReceiptLoading(false);});
    return()=>{active=false;};
  },[apiBase,token,connected,accountingTab,receiptPage,receiptPageSize,
    receiptAppliedSearch,receiptAppliedYear,receiptAppliedMonth,receiptRevision]);

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
    if(!due){setReceiptNoDue(true);setEntryMode(null);return;}
    setReceiptNoDue(false);
    setSelectedScheduleId(due.id);
    setFieldErrors({});
    setAmountInput('');
    setTransactionDate(accountingBusinessDay(new Date()));
    setTransactionReference('');
    receiptAttempt.current=null;
    setEntryMode('receipt');
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
    if(serviceFrom&&serviceTo&&serviceFrom>serviceTo){
      setDateRangeError('Từ ngày không được sau Đến ngày.');
      return;
    }
    setDateRangeError('');
    setPage(1);
    setAppliedSearch(search);
    setAppliedServiceFrom(serviceFrom);
    setAppliedServiceTo(serviceTo);
  };

  const openReceiptForm=()=>{
    setSelected(null);setDetail(null);setReceivableSearch('');setReceivablePage(1);
    setReceivableChoice(null);setReceivablePickerOpen(false);setReceiptNoDue(false);
    receiptAttempt.current=null;
    setTransactionDate(accountingBusinessDay(new Date()));setTransactionReference('');
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
    const paymentTerm=detail.schedules.find(item=>item.id===selectedScheduleId);
    const signedOn = contractSignedDay(entryMode==='receipt'
      ? (paymentTerm?.renewal_signed_on??detail.data.signed_on) : detail.data.signed_on);
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
            payment_method:'BANK_TRANSFER',evidence_id:attempt.evidenceId
          })
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
      if(entryMode==='receipt'){
        setReceiptRevision(v=>v+1);setReceiptIntent(false);
        setReceiptPage(1);
      }
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
      setPayoutDialogOpen(false);setPayoutPickerOpen(false);setEditingPayout(null);payoutKey.current=null;
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
    setServiceFrom('');setServiceTo('');
    setAppliedServiceFrom('');setAppliedServiceTo('');
    setDateRangeError('');
    setNeedsAction('ALL');
    setPage(1);
  };
  const displayedPayouts=payoutRows;
  const visiblePayouts=payoutRows;
  const eligibleCandidates=eligibleRows;
  const payoutChoices=eligibleRows;
  const candidateKey=(item:typeof eligibleCandidates[number])=>[item.contract_id,item.beneficiary_user_id,item.beneficiary_role,item.period].join(':');
  const chosenCandidate=payoutChoices.find(item=>candidateKey(item)===payoutCandidateKey);
  const receiptCurrentYear=Number(accountingBusinessDay(new Date()).slice(0,4));
  const receiptMonthOptions=[{value:'ALL',label:'Tất cả các tháng'},...Array.from({length:12},(_,i)=>({value:String(i+1),label:'Tháng '+String(i+1)}))];
  const receiptYearOptions=[{value:'ALL',label:'Tất cả các năm'},
    ...Array.from({length:Math.min(32,receiptCurrentYear-2000+2)},(_,index)=>{
      const year=String(receiptCurrentYear+1-index);
      return {value:year,label:'Năm '+year};
    })];
  const resetFinanceFilters=()=>{
    setFinanceSearch('');setFinanceAppliedSearch('');setFinanceOrganization('ALL');
    setFinanceRole('ALL');setFinanceStatus('ALL');setFinancePage(1);
  };
  const payoutDraftForm=detail&&payoutDialogOpen?(
    <form id="accounting-payout-draft-form" className="space-y-4 text-sm" onSubmit={event=>{event.preventDefault();void createPayout();}}>
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
      </form>
  ):null;
  const financialTransactionForm=detail&&entryMode?(
    <form id="accounting-financial-transaction-form" noValidate className="space-y-4" onChange={event=>{
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
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {detail.schedules.filter(x=>x.amount_received<x.amount_due).map(x=><option key={x.id} value={x.id}>
              {x.renewal_no?'Tái ký lần '+x.renewal_no:'Hợp đồng lần đầu'} · {channelDate(x.due_on)} · Còn {channelMoney(x.amount_due-x.amount_received)}</option>)}
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
            }} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {detail.payouts.filter(x=>x.status==='APPROVED').map(x=><option key={x.id} value={x.id}>{x.code} · {channelMoney(x.net_amount)}</option>)}
          </select>{fieldErrors.payout_id && <span role="alert" className="text-xs text-red-700">{fieldErrors.payout_id}</span>}</label>}
        <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><label htmlFor="accounting-transaction-date">Ngày giao dịch *</label>
          <Input id="accounting-transaction-date" type="date" name="transaction_date" required
            aria-invalid={Boolean(fieldErrors.transaction_date)} value={transactionDate}
            onChange={event=>setTransactionDate(event.target.value)}/>{fieldErrors.transaction_date && <p role="alert" className="text-xs text-red-700">{fieldErrors.transaction_date}</p>}</div>
        <div className="space-y-1.5"><label htmlFor="accounting-amount">{entryMode==='receipt'?'Số tiền nhà trường thực trả (VNĐ) *':'Số tiền đã chuyển (VNĐ) *'}</label>
          <div className="relative">
            <AppCurrencyInput id="accounting-amount" name="amount"
              placeholder="0" required aria-invalid={Boolean(fieldErrors.amount)} value={amountInput}
              onValueChange={setAmountInput}
              className="pr-12 tabular-nums text-right"/>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">đ</span>
          </div>
          {fieldErrors.amount && <p role="alert" className="text-xs text-red-700">{fieldErrors.amount}</p>}</div>
        </div>
        {entryMode==='payout' && <p className="text-xs text-muted-foreground">Số tiền chi phải khớp phiếu chi đã duyệt; chưa hỗ trợ chia nhỏ một phiếu chi.</p>}
        <div className="space-y-1"><label htmlFor="accounting-bank-reference">Mã giao dịch ngân hàng *</label>
          <Input id="accounting-bank-reference" name="reference_code" required maxLength={64}
            aria-invalid={Boolean(fieldErrors.reference_code)} value={transactionReference}
            onChange={event=>setTransactionReference(event.target.value)}/>{fieldErrors.reference_code && <p role="alert" className="text-xs text-red-700">{fieldErrors.reference_code}</p>}</div>
        <div className="space-y-1"><label htmlFor="accounting-bank-proof">Ảnh chứng từ chuyển khoản *</label>
          <Input id="accounting-bank-proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required aria-invalid={Boolean(fieldErrors.proof)}/>
          {fieldErrors.proof && <p role="alert" className="text-xs text-red-700">{fieldErrors.proof}</p>}
          <p className="text-xs text-muted-foreground">JPG, PNG, WEBP · tối đa 5 MB · lưu riêng tư theo phân quyền</p></div>
      </form>
  ):null;
  return <div className="min-w-0 space-y-5">
    <AppPageHeader eyebrow="KẾ TOÁN / KIDSFIT CRM"
      title={accountingTab==='CONTRACTS'?'Hợp đồng & hoa hồng'
        :accountingTab==='RECEIPTS'?'Khoản thu nhà trường':'Phiếu chi hoa hồng'}
      description={accountingTab==='CONTRACTS'
        ?'Theo dõi kỳ sử dụng, xử lý tái ký và đối soát tài chính trong một danh sách hợp đồng.'
        :accountingTab==='RECEIPTS'
          ?'Ghi nhận tiền nhà trường thanh toán và quản lý chứng từ theo hợp đồng.'
          :'Lập phiếu, trình BGĐ phê duyệt và theo dõi chi trả hoa hồng Sales/Quản lý.'}
      actions={accountingTab==='RECEIPTS'&&canRecordRevenue
        ?<AppButton type="button" tone="green" premium
          leadingIcon={<Plus aria-hidden="true" className="size-4"/>} onClick={openReceiptForm}>
          Thêm mới
        </AppButton>
        :accountingTab==='PAYOUTS'&&canCreatePayout
          ?<AppButton type="button" tone="green" premium
            leadingIcon={<Plus aria-hidden="true" className="size-4"/>}
            onClick={()=>{setPayoutPickerSearch('');setEligiblePage(1);setPayoutCandidateKey('');setPayoutPickerOpen(true);}}>
            Thêm mới
          </AppButton>:undefined}/>
    {!connected && <p role="alert" className="rounded-lg border p-4 text-sm text-muted-foreground">Cần đăng nhập bằng tài khoản có quyền xem hoa hồng để tải dữ liệu thực tế.</p>}
    <div role="tablist" aria-label="Nghiệp vụ Kế toán"
      className="flex min-h-12 gap-x-6 overflow-x-auto overflow-y-hidden border-b border-border bg-transparent [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      <form onSubmit={submitSearch} className="flex flex-wrap items-center gap-2.5 border-b border-border/80 px-4 py-4 sm:px-5">
        <div className="relative min-w-[210px] flex-[1_1_270px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true"/>
          <Input aria-label="Tìm hợp đồng và hoa hồng" className="h-10 w-full rounded-lg bg-card pl-10"
            placeholder="Tên trường, mã hợp đồng, Sales..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <AppDatePicker label="Từ ngày" value={serviceFrom}
          onChange={value=>{setServiceFrom(value);setDateRangeError('');}} className="w-full sm:w-[148px]"/>
        <AppDatePicker label="Đến ngày" value={serviceTo}
          onChange={value=>{setServiceTo(value);setDateRangeError('');}} className="w-full sm:w-[148px]"/>
        <AppSelect ariaLabel="Bộ lọc cần xử lý" value={needsAction} className="w-full sm:w-[154px]"
          options={[{value:'ALL',label:'Tất cả xử lý'},{value:'YES',label:'Cần xử lý'}]}
          onValueChange={value=>{setNeedsAction(value);setPage(1);}}/>
        <AppButton type="submit" tone="orange" premium className="h-10 rounded-lg px-4">Tìm kiếm</AppButton>
        <AppButton type="button" tone="outline" size="icon-lg" className="h-10 w-10 min-w-10 rounded-lg p-0"
          aria-label="Đặt lại bộ lọc" title="Đặt lại bộ lọc" onClick={resetFilters}>
          <RotateCcw className="size-4" aria-hidden="true"/>
        </AppButton>
        {dateRangeError&&<p role="alert" className="w-full text-xs text-destructive">{dateRangeError}</p>}
      </form>
      {busy&&rows.length>0&&<div className="px-4 py-2"><InlineLoading label="Đang cập nhật danh sách hợp đồng..."/></div>}
      {busy&&rows.length===0?<output className="block space-y-3 p-5" aria-label="Đang tải danh sách hợp đồng">
        {Array.from({length:6},(_,index)=><AppSkeleton key={index} className="h-11 w-full"/>)}
      </output>:<AccountingContractTreeTable key={[appliedSearch,appliedServiceFrom,appliedServiceTo,needsAction,page].join(':')}
        rows={rows} fromDate={appliedServiceFrom} toDate={appliedServiceTo} needsAction={needsAction!=='ALL'}
        canConfirm={abilities.includes('channel_sales.renewal.confirm')||abilities.includes('*')}
        canRequestInfo={abilities.includes('channel_sales.renewal.review')||abilities.includes('*')}
        onView={(contractId,renewalId)=>openContract(contractId,renewalId)}
        onReview={(contractId,renewalId)=>openRenewal(contractId,renewalId,'confirm')}
        onRequestInfo={(contractId,renewalId)=>openRenewal(contractId,renewalId,'request-info')}/>}
      {!busy && rows.length===0 && <p className="p-10 text-center text-sm text-muted-foreground">Không có hợp đồng phù hợp. Hãy thử bộ lọc khác.</p>}
      <AppPagination page={page} pageSize={pageSize} total={total} itemLabel="hợp đồng"
        disabled={busy} showSummary={false} pageSizeOptions={[20,50,100]}
        onPageChange={setPage}
        onPageSizeChange={size=>{setPageSize(size);setPage(1);}}/>
    </AdminListPanel>}
    {accountingTab==='RECEIPTS'&&<AdminListPanel className="min-w-0">
      <AdminListToolbar search={receiptSearch} onSearchChange={setReceiptSearch}
        onSearch={()=>{setReceiptAppliedSearch(receiptSearch.trim());setReceiptAppliedYear(receiptYear);setReceiptAppliedMonth(receiptMonth);setReceiptPage(1);}}
        onReset={()=>{setReceiptSearch('');setReceiptAppliedSearch('');setReceiptYear('ALL');setReceiptAppliedYear('ALL');setReceiptMonth('ALL');setReceiptAppliedMonth('ALL');setReceiptPage(1);}}
        searchLabel="Tìm khoản thu nhà trường"
        placeholder="Tên trường, hợp đồng, mã giao dịch..."
        filters={<div className="flex flex-wrap gap-2">
          <AppSelect ariaLabel="Lọc năm nhận tiền" className="w-full sm:w-40"
            value={receiptYear} options={receiptYearOptions} onValueChange={year=>{setReceiptYear(year);if(year==='ALL')setReceiptMonth('ALL');}}/>
          <AppSelect ariaLabel="Lọc tháng nhận tiền" className="w-full sm:w-40"
            value={receiptMonth} options={receiptMonthOptions} disabled={receiptYear==='ALL'} onValueChange={setReceiptMonth}/>
        </div>}/>
      {receiptLoading?<output className="block p-5 text-sm text-muted-foreground">Đang tải các khoản thu...</output>:
      <div className="w-full overflow-x-auto">
        <table className={adminTableClass+' table-fixed'}>
          <thead className={adminTableHeadClass}>
            <tr>
              <th scope="col" className="w-[29%] whitespace-nowrap px-4 py-3">Nhà trường</th>
              <th scope="col" className="w-[14%] whitespace-nowrap px-3 py-3">Ngày thu</th>
              <th scope="col" className="w-[18%] whitespace-nowrap px-3 py-3 text-right">Số tiền</th>
              <th scope="col" className="w-[21%] whitespace-nowrap px-3 py-3">Mã giao dịch</th>
              <th scope="col" className="w-[10%] whitespace-nowrap px-2 py-3 text-center">Chứng từ</th>
              <th scope="col" className="w-[8%] whitespace-nowrap px-2 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {receiptRows.map(receipt=><tr key={receipt.id} className="transition-colors even:bg-muted/20 hover:bg-accent/60">
              <td className="min-w-0 px-4 py-4 align-middle">
                <p className="break-words font-semibold text-foreground" title={receipt.school_name}>{receipt.school_name}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{receipt.contract_code}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-4 align-middle tabular-nums">
                {channelDate(receipt.received_at)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-right align-middle font-semibold tabular-nums">
                {channelMoney(receipt.amount)}
              </td>
              <td className="min-w-0 break-all px-3 py-4 align-middle" title={receipt.reference_code||undefined}>
                {receipt.reference_code}
              </td>
              <td className="px-2 py-4 text-center align-middle">
                {receipt.proof_id&&receipt.proof_file_name
                  ?<AdminIconAction icon={ImageIcon} label={'Xem chứng từ khoản thu '+(receipt.reference_code||receipt.id)}
                    onClick={()=>void viewEvidence(receipt.proof_id!,receipt.proof_file_name!)}/>
                  :<span className="text-muted-foreground" aria-label="Không có chứng từ">—</span>}
              </td>
              <td className="px-2 py-4 text-center align-middle">
                <div className="flex items-center justify-center gap-2">
                  <AdminIconAction icon={Eye} label={'Xem khoản thu '+(receipt.reference_code||receipt.id)}
                    onClick={()=>setReceiptPreview(receipt)}/>
                </div>
              </td>
            </tr>)}
            {receiptRows.length===0&&<tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
              Không có khoản thu phù hợp. Chọn Thêm mới để ghi nhận giao dịch đã đối chiếu.
            </td></tr>}
          </tbody>
        </table>
      </div>}
      <AppPagination page={receiptPage} pageSize={receiptPageSize} total={receiptTotal}
        itemLabel="khoản thu" disabled={receiptLoading} showSummary={false} pageSizeOptions={[10,20,50,100]}
        onPageChange={setReceiptPage} onPageSizeChange={size=>{setReceiptPageSize(size);setReceiptPage(1);}}/>
    </AdminListPanel>}
    {accountingTab==='PAYOUTS'&&<AdminListPanel className="min-w-0">
      <AdminListToolbar search={financeSearch} onSearchChange={setFinanceSearch}
        onSearch={()=>{setFinanceAppliedSearch(financeSearch.trim());setFinancePage(1);}}
        onReset={resetFinanceFilters} searchLabel="Tìm phiếu chi"
        placeholder="Mã phiếu, nhà trường, người hưởng..."
        filters={<AppSelect ariaLabel="Lọc trạng thái phiếu chi" className="w-full sm:w-[190px]"
          value={financeStatus}
          options={[{value:'ALL',label:'Tất cả trạng thái'},
            {value:'DRAFT',label:'Nháp'},
            {value:'PENDING_APPROVAL',label:'Chờ BGĐ duyệt'},
            {value:'CHANGES_REQUESTED',label:'Cần bổ sung'},
            {value:'APPROVED',label:'Đã duyệt'},
            {value:'PAID',label:'Đã chi'},
            {value:'CANCELLED',label:'Đã hủy'},
            {value:'REJECTED',label:'Đã từ chối'}]}
          onValueChange={next=>{setFinanceStatus(next);setFinancePage(1);}}/>}/>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-5 py-3 sm:px-6">
        <label htmlFor="accounting-finance-period" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
          Kỳ hoa hồng
          <Input id="accounting-finance-period" type="month" className="h-10 w-40 rounded-lg"
            value={financePeriod} onChange={event=>{setFinancePeriod(event.target.value);setFinancePage(1);}}/>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs tabular-nums text-muted-foreground">
            {displayedPayouts.length} phiếu trang này · {payoutTotal} phiếu phù hợp
          </span>
          <Button type="button" variant="outline" size="sm" aria-controls="accounting-payout-advanced"
            aria-expanded={financeAdvancedOpen} onClick={()=>setFinanceAdvancedOpen(value=>!value)}
            className="h-10 rounded-lg text-xs">
            <SlidersHorizontal className="size-4" aria-hidden="true"/>
            Bộ lọc nâng cao
            {(financeRole!=='ALL'||financeOrganization!=='ALL')&&<span className="sr-only">(đang áp dụng)</span>}
          </Button>
        </div>
      </div>
      {financeAdvancedOpen&&<div id="accounting-payout-advanced"
        className="flex flex-wrap items-center gap-3 border-b border-border/80 bg-muted/20 px-5 py-3 sm:px-6">
        <AppSelect ariaLabel="Lọc tổ chức phiếu chi" className="w-full sm:w-[220px]"
          value={financeOrganization}
          options={[{value:'ALL',label:'Tất cả tổ chức'},
            ...payoutOrganizations.map(org=>({value:String(org.id),label:org.name}))]}
          onValueChange={next=>{setFinanceOrganization(next);setFinancePage(1);}}/>
        <AppSelect ariaLabel="Lọc người hưởng hoa hồng" className="w-full sm:w-[190px]"
          value={financeRole}
          options={[{value:'ALL',label:'Sales và Quản lý'},{value:'SALES',label:'Sales'},{value:'MANAGER',label:'Quản lý'}]}
          onValueChange={next=>{setFinanceRole(next);setFinancePage(1);}}/>
      </div>}
      <div className="overflow-x-auto">
        <table className={adminTableClass+' table-fixed'}>
          <thead className={adminTableHeadClass}>
            <tr>
              <th scope="col" className="w-[19%] px-4 py-3">Người hưởng</th>
              <th scope="col" className="w-[27%] px-3 py-3">Nhà trường</th>
              <th scope="col" className="w-[17%] px-3 py-3 text-right">Số tiền đề nghị / thực chi</th>
              <th scope="col" className="w-[15%] px-3 py-3">Trạng thái</th>
              <th scope="col" className="w-[12%] px-3 py-3">Kỳ</th>
              <th scope="col" className="w-[10%] px-3 py-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {visiblePayouts.map(p=><tr key={p.id} className="transition-colors even:bg-muted/20 hover:bg-accent/60">
              <td className="min-w-0 px-4 py-3">
                <p className="break-words font-semibold">{p.beneficiary_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.beneficiary_role==='MANAGER'?'Quản lý':'Sales'}</p>
              </td>
              <td className="min-w-0 px-3 py-3">
                <p className="max-w-[230px] break-words text-sm font-semibold">{p.school_names?.length?p.school_names.join(', '):'Chưa xác định nhà trường'}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{p.contract_codes?.length?p.contract_codes.join(', '):'Cần đối soát liên kết phiếu'}</p>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">{channelMoney(p.net_amount)}<span className="mt-1 block text-[11px] font-normal text-muted-foreground">{p.status==='PAID'?'Đã thực chi':'Dự kiến chi'}</span></td>
              <td className="px-3 py-3">
                <AppStatusBadge size="sm" status={p.status} label={payoutStatusLabel(p.status)}
                  tone={p.status==='PAID'||p.status==='APPROVED'?'success'
                    :p.status==='REJECTED'||p.status==='CANCELLED'?'danger'
                    :p.status==='CHANGES_REQUESTED'||p.status==='PENDING_APPROVAL'?'warning':'neutral'}/>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-xs">{payoutPeriodLabel(p.period)}</td>
              <td className="px-3 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <AdminIconAction icon={Eye} label={'Xem phiếu chi '+p.code}
                    onClick={()=>setPayoutPreview(p)}/>
                  {p.can_edit&&
                    <AdminIconAction icon={Pencil} tone="blue" label={'Sửa phiếu chi '+p.code}
                      onClick={()=>{setPayoutPickerOpen(true);openCentralPayout({contractId:p.contract_ids![0],
                        beneficiaryUserId:p.beneficiary_user_id,role:p.beneficiary_role,
                        period:p.period,mode:'EDIT',payoutId:p.id});}}/>}
                </div>
              </td>
            </tr>)}
            {!visiblePayouts.length&&<tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
              {financeLoading?'Đang tải danh sách phiếu chi...':!connected?'Cần đăng nhập để xem phiếu chi.':'Không có phiếu chi phù hợp với bộ lọc.'}
            </td></tr>}
          </tbody>
        </table>
      </div>
      <AppPagination page={financePage} pageSize={financePageSize} total={payoutTotal}
        itemLabel="phiếu chi" disabled={financeLoading} showSummary={false}
        pageSizeOptions={[10,20,50,100]}
        onPageChange={setFinancePage}
        onPageSizeChange={size=>{setFinancePageSize(size);setFinancePage(1);}}/>
    </AdminListPanel>}
    <AppDialog open={receiptIntent} onOpenChange={open=>{if(!open&&!saving){setReceiptIntent(false);setEntryMode(null);setSelected(null);setReceivableChoice(null);setReceivablePickerOpen(false);}}}
      busy={saving} title="Ghi nhận khoản thu nhà trường"
      description={undefined}
      bodyClassName="py-4 sm:py-5"
      footer={<>
        <AppButton type="button" tone="neutral" disabled={saving} className="h-11 min-w-28"
          onClick={()=>{setReceiptIntent(false);setEntryMode(null);setSelected(null);setReceivableChoice(null);setReceivablePickerOpen(false);}}>Hủy</AppButton>
        <AppButton type="submit" form="accounting-financial-transaction-form" tone="green"
          disabled={saving||receivablePickerOpen||!receivableChoice||!detail||detail.data.id!==selected||entryMode!=='receipt'}
          busy={saving} className="h-11 min-w-40">Ghi nhận khoản thu</AppButton>
      </>}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="receivable-contract-search" className="text-sm font-semibold">Nhà trường / Hợp đồng *</label>
          {receivableChoice&&!receivablePickerOpen?
            <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{receivableChoice.school_name}</p>
                <p className="text-xs text-muted-foreground">{receivableChoice.code}</p>
              </div>
              <AppButton type="button" tone="outline" disabled={saving}
                onClick={()=>{setReceivablePickerOpen(true);setReceivableSearch('');setReceivablePage(1);}}>
                Thay đổi
              </AppButton>
            </div>:
            <div className="relative">
              <Input id="receivable-contract-search" autoComplete="off"
                aria-expanded={receivablePickerOpen} aria-controls="receivable-contract-options"
                value={receivableSearch} placeholder="Tìm tên trường hoặc mã hợp đồng..."
                onFocus={()=>setReceivablePickerOpen(true)}
                onChange={event=>{setReceivableSearch(event.target.value);setReceivablePage(1);setReceivablePickerOpen(true);}}
                onKeyDown={event=>{if(event.key==='Escape'){setReceivablePickerOpen(false);event.stopPropagation();}}}/>
              {receivablePickerOpen&&<div id="receivable-contract-options" aria-label="Hợp đồng còn phải thu"
                className="absolute inset-x-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
                {receivableLoading?<output className="block p-3 text-sm text-muted-foreground">Đang tìm hợp đồng...</output>
                  :receivableRows.length===0?<p className="p-3 text-sm text-muted-foreground">Không có hợp đồng còn phải thu phù hợp.</p>
                  :receivableRows.map(item=><button type="button" key={item.id}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    onClick={()=>{setReceivableChoice(item);setSelected(item.id);setEntryMode(null);
                      setDetail(null);setSelectedScheduleId(null);setReceiptNoDue(false);setFieldErrors({});setAmountInput('');
                      setTransactionReference('');receiptAttempt.current=null;setReceivablePickerOpen(false);}}>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.school_name}</span>
                      <span className="block text-xs text-muted-foreground">{item.code}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-primary">{channelMoney(item.amount_remaining)}</span>
                  </button>)}
                {receivableTotal>50&&<div className="flex items-center justify-between gap-2 border-t border-border p-2 text-xs">
                  <span>Trang {receivablePage} / {Math.ceil(receivableTotal/50)}</span>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={receivablePage<=1||receivableLoading}
                      onClick={()=>setReceivablePage(v=>v-1)}>Trước</Button>
                    <Button type="button" size="sm" variant="outline" disabled={receivablePage*50>=receivableTotal||receivableLoading}
                      onClick={()=>setReceivablePage(v=>v+1)}>Sau</Button>
                  </div>
                </div>}
              </div>}
            </div>}
        </div>
        {receivableChoice&&<div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2">
          <div><p className="text-xs text-muted-foreground">Sales / CTV phụ trách</p>
            <p className="mt-1 text-sm font-semibold">{receivableChoice.owner_name}</p>
            <p className="text-xs text-muted-foreground">{receivableChoice.personnel_type==='COLLABORATOR'?'CTV':'Nhân viên'}</p>
          </div>
          <div><p className="text-xs text-muted-foreground">Quản lý phụ trách</p>
            <p className="mt-1 text-sm font-semibold">{receivableChoice.manager_name||'Chưa xác định'}</p>
          </div>
        </div>}
        {receivableChoice&&(detail?.data.id!==selected||entryMode!=='receipt')&&
          <output className="block rounded-lg border border-border/70 p-3 text-sm text-muted-foreground">
            {receiptNoDue?'Hợp đồng không còn đợt thanh toán có thể thu. Vui lòng chọn hợp đồng khác.':detail?.data.id===selected?'Đang kiểm tra các đợt thanh toán có thể thu...':'Đang tải thông tin hợp đồng...'}
          </output>}
        {!receivablePickerOpen&&entryMode==='receipt'&&detail?.data.id===selected&&financialTransactionForm}
      </div>
    </AppDialog>
    <AppDialog open={receiptPreview!==null} onOpenChange={open=>{if(!open)setReceiptPreview(null);}}
      title="Chi tiết khoản thu"
      description="Khoản thu đã ghi nhận không được sửa/xóa trực tiếp vì có thể phát sinh hoa hồng.">
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
          {canAdjustCommission&&<Button type="button" variant="outline"
            onClick={()=>{const receiptId=receiptPreview.id;setReceiptPreview(null);void openBackfill(receiptId);}}>
            <ClipboardCheck className="size-4" aria-hidden="true"/> Kiểm tra & đối soát
          </Button>}
          <Button type="button" onClick={()=>{setSelectedPeriodId(null);setSelected(receiptPreview.contract_id);setAccountingTab('CONTRACTS');setReceiptPreview(null);}}>
            <FileCheck2 className="size-4" aria-hidden="true"/> Xem hợp đồng
          </Button>
        </div>
      </div>}
    </AppDialog>
    <AppDialog open={payoutPickerOpen} onOpenChange={open=>{if(!saving&&!open){setPayoutPickerOpen(false);setPayoutDialogOpen(false);setCentralPayoutIntent(null);setEditingPayout(null);}}}
      busy={saving} title="Lập phiếu chi hoa hồng"
      description="Chọn kỳ hoa hồng, nhà trường và người hưởng đủ điều kiện."
      footer={!payoutDialogOpen&&!centralPayoutIntent?<>
        <AppButton type="button" tone="neutral" disabled={saving} onClick={()=>setPayoutPickerOpen(false)}>Hủy</AppButton>
        <AppButton type="button" tone="green" disabled={!chosenCandidate||eligibleLoading||saving} onClick={()=>{
          if(!chosenCandidate)return;
          openCentralPayout({contractId:chosenCandidate.contract_id,beneficiaryUserId:chosenCandidate.beneficiary_user_id,
            role:chosenCandidate.beneficiary_role,period:chosenCandidate.period,mode:'CREATE'});
        }}>Tiếp tục lập phiếu</AppButton>
      </>:undefined}>
      {payoutDialogOpen&&detail?payoutDraftForm:centralPayoutIntent?
        <output className="block py-6 text-center text-sm text-muted-foreground">Đang tải phiếu chi...</output>:
        <div className="space-y-4">
        <label htmlFor="accounting-payout-month" className="block space-y-1 text-sm font-medium">
          <span>Kỳ hoa hồng *</span>
          <Input id="accounting-payout-month" type="month" value={financePeriod}
            onChange={event=>{setFinancePeriod(event.target.value);setEligiblePage(1);setPayoutCandidateKey('');}}/>
        </label>
        <label htmlFor="accounting-payout-search" className="block space-y-1 text-sm font-medium">
          <span>Tìm nhà trường / hợp đồng</span>
          <Input id="accounting-payout-search" value={payoutPickerSearch}
            onChange={event=>{setPayoutPickerSearch(event.target.value);setEligiblePage(1);setPayoutCandidateKey('');}}
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
        {eligibleLoading?<output className="block text-xs text-muted-foreground">Đang tải khoản hoa hồng...</output>
          :payoutChoices.length===0?<p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Chưa có hoa hồng đủ điều kiện ở kỳ hoặc bộ lọc này.</p>:null}
        {chosenCandidate&&<div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold">{chosenCandidate.school_name}</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">{chosenCandidate.contract_code} · {chosenCandidate.beneficiary_name}</p>
          <p className="mt-2 text-lg font-bold text-primary tabular-nums">Hoa hồng đề xuất: {channelMoney(chosenCandidate.amount)}</p>
        </div>}
        {eligibleTotal>20&&<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{eligibleTotal} khoản đủ điều kiện · trang {eligiblePage}/{Math.ceil(eligibleTotal/20)}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={eligiblePage<=1||eligibleLoading}
              onClick={()=>{setEligiblePage(x=>x-1);setPayoutCandidateKey('');}}>Trước</Button>
            <Button type="button" variant="outline" size="sm" disabled={eligiblePage*20>=eligibleTotal||eligibleLoading}
              onClick={()=>{setEligiblePage(x=>x+1);setPayoutCandidateKey('');}}>Sau</Button>
          </div>
        </div>}
      </div>}
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
          {payoutPreview.can_edit&&<Button type="button" size="sm" variant="outline" disabled={saving}
              onClick={()=>{setPayoutPickerOpen(true);openCentralPayout({contractId:payoutPreview.contract_ids![0],beneficiaryUserId:payoutPreview.beneficiary_user_id,
                role:payoutPreview.beneficiary_role,period:payoutPreview.period,mode:'EDIT',payoutId:payoutPreview.id});}}>
              <Pencil className="size-4" aria-hidden="true"/> Sửa phiếu
            </Button>}
          {payoutPreview.can_submit&&<Button type="button" size="sm" disabled={saving}
              onClick={()=>{const id=payoutPreview.id;setPayoutPreview(null);void submitPayout(id);}}>
              <Send className="size-4" aria-hidden="true"/> Gửi BGĐ duyệt
            </Button>}
          {payoutPreview.can_approve&&<>
            <Button type="button" size="sm" variant="outline" disabled={saving}
              onClick={()=>{setReturningPayoutId(payoutPreview.id);setPayoutPreview(null);}}>Yêu cầu bổ sung</Button>
            <Button type="button" size="sm" disabled={saving}
              onClick={()=>{const id=payoutPreview.id;setPayoutPreview(null);void approvePayout(id);}}>Duyệt phiếu</Button>
          </>}
          {payoutPreview.can_complete&&
            <Button type="button" size="sm" disabled={saving}
              onClick={()=>openCentralPayout({contractId:payoutPreview.contract_ids![0],
                beneficiaryUserId:payoutPreview.beneficiary_user_id,role:payoutPreview.beneficiary_role,
                period:payoutPreview.period,mode:'COMPLETE',payoutId:payoutPreview.id})}>
              <WalletCards className="size-4" aria-hidden="true"/> Ghi nhận chuyển khoản
            </Button>}
        </div>
      </div>}
    </AppDialog>
    <AppDrawer compactHeader open={selected!==null&&accountingTab==='CONTRACTS'}
      onOpenChange={open=>{if(!open){setSelected(null);setFocusedRenewal(null);setEntryMode(null);closePreview();}}}
      title="Chi tiết hợp đồng" description="Kế toán / Hồ sơ hợp đồng">
      {!detail||selected===null||detail.data.id!==selected
        ?<output className="block space-y-3 p-2" aria-label="Đang tải chi tiết hợp đồng">
          <AppSkeleton className="h-20 w-full"/><AppSkeleton className="h-36 w-full"/><AppSkeleton className="h-28 w-full"/>
        </output>
        :<AccountingContractDetailContent detail={detail}
          sourceRow={rows.find(row=>row.id===selected)}
          contractId={selected} selectedPeriodId={selectedPeriodId}
          focusedRenewal={focusedRenewal} giHistory={giHistory}
          apiBase={apiBase} token={token} abilities={abilities}
          onChanged={async()=>{setDetailRevision(v=>v+1);await load();await onChanged();}}/>}
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
    <AppDialog
      open={Boolean(detail&&payoutDialogOpen&&!payoutPickerOpen)}
      onOpenChange={open=>{if(!saving){setPayoutDialogOpen(open);if(!open){payoutKey.current=null;setEditingPayout(null);}}}}
      busy={saving} title={editingPayout?'Chỉnh sửa phiếu chi Nháp':'Lập phiếu chi hoa hồng'}
      description="Kế toán được sửa % và tiền hoa hồng. BGĐ sẽ xem cả đề xuất gốc và số liệu điều chỉnh."
      footer={<>
        <AppButton type="button" tone="neutral" disabled={saving} onClick={()=>{
          setPayoutDialogOpen(false);setPayoutPickerOpen(false);payoutKey.current=null;
        }}>Hủy</AppButton>
        <AppButton type="submit" form="accounting-payout-draft-form" tone="green"
          busy={saving} disabled={!editingPayout&&!chosenPeriod}>Lưu nháp</AppButton>
      </>}>
      {payoutDraftForm}
    </AppDialog>
    <AppDialog open={Boolean(detail && entryMode==='payout')} onOpenChange={open=>{if(!open && !saving){setEntryMode(null);receiptAttempt.current=null;}}}
      busy={saving} title="Ghi nhận chuyển khoản phiếu chi"
      description="Nhập đúng ngày, số tiền và ảnh chứng từ cho giao dịch."
      footer={<>
        <AppButton type="button" tone="neutral" disabled={saving} onClick={()=>setEntryMode(null)}>Hủy</AppButton>
        <AppButton type="submit" form="accounting-financial-transaction-form"
          tone="green" busy={saving}>Xác nhận đã chuyển tiền</AppButton>
      </>}>
      {financialTransactionForm}
    </AppDialog>
    <EvidencePreviewDialog preview={preview} onClose={closePreview}/>
  </div>;
}

