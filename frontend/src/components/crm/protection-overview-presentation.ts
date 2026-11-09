/**
 * Presentation-only projections: service condition and actionable workflow are
 * independent dimensions. Never infer protection release from a 12-month threshold.
 */
export type ProtectionOverviewState = {
  interruption_status:string;
  protection_status:string;
  renewal_status:string;
  has_pending_renewal:boolean;
  has_open_dispute:boolean;
  can_request:boolean;
};
export type ProtectionAction = {status:string; label:string} | null;

export function protectionServiceStatus(row:ProtectionOverviewState):string {
  const state=row.interruption_status;
  if (state.startsWith('EXCEPTION_')) return 'THRESHOLD_REACHED';
  // Historical qualifying gaps must not imply that the current service is stopped.
  if (state==='HISTORICALTHRESHOLDREQUIRESREVIEW') return 'HISTORICALTHRESHOLDREQUIRESREVIEW';
  if (state==='RELEASED') return 'THRESHOLD_REACHED';
  return state;
}

export function protectionAction(row:ProtectionOverviewState):ProtectionAction {
  const state=row.interruption_status;
  // Never present a released right as an outstanding Sales ownership action.
  if (row.protection_status==='RELEASED' || state==='RELEASED') return null;
  if (row.has_open_dispute || state==='EXCEPTION_DISPUTE')
    return {status:'REVIEW_DISPUTE',label:'Chờ giải quyết tranh chấp'};
  if (state==='EXCEPTION_OVERDUE')
    return {status:'ACCOUNTING_OVERDUE',label:'Ngoại lệ Kế toán quá hạn'};
  if (state==='EXCEPTION_CONFIG_REQUIRED')
    return {status:'REVIEW_CONFIG',label:'Chờ cấu hình ngoại lệ'};
  if (state==='EXCEPTION_OWNERSHIP' || state==='THRESHOLD_REACHED')
    return {status:'REVIEW_RIGHTS',label:'Cần rà soát quyền'};
  if (state==='HISTORICALTHRESHOLDREQUIRESREVIEW')
    return {status:'REVIEW_HISTORY',label:'Rà soát lịch sử'};
  if (state==='MISSINGSERVICETERM')
    return {status:'VERIFY_PERIOD',label:'Bổ sung kỳ dịch vụ'};
  if (row.has_pending_renewal || state==='EXCEPTION_ACCOUNTING' || row.renewal_status==='WAITING_RENEWAL')
    return {status:'WAIT_ACCOUNTING',label:'Chờ Kế toán xác nhận'};
  if (row.renewal_status==='PENDING_MANAGER')
    return {status:'WAIT_MANAGER',label:'Chờ Quản lý duyệt'};
  if (row.can_request)
    return {status:'REQUEST_REVIEW',label:'Yêu cầu xem xét bảo vệ'};
  if (row.renewal_status==='REJECTED')
    return {status:'REVIEW_REJECTION',label:'Xem hồ sơ bị từ chối'};
  if (state==='INTERRUPTED')
    return {status:'FOLLOW_UP',label:'Theo dõi liên hệ'};
  return null;
}
