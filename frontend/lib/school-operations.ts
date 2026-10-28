export type WorkflowPolicy = {
  id: number;
  organization_id: number;
  version: number;
  status: string;
  manager_review_hours: number;
  admin_review_hours: number;
  invitation_hours: number;
  max_extension_days: number;
  max_extension_count: number;
  max_total_extension_days: number;
  decision_reference: string;
};
export type SchoolOperationsWorkspace = {
  pagination?: {
    page: number;
    page_size: number;
    totals: Record<string, number>;
  };
  server_time: string;
  user_id: number;
  organizations: { id: number; name: string }[];
  proposals: {
    id: number;
    version: number;
    organization_id: number;
    school_code: string;
    name: string;
    province: string;
    ward: string;
    address: string | null;
    contact_name: string | null;
    contact_position: string | null;
    contact_phone: string | null;
    email: string | null;
    reason: string;
    status: string;
    review_due_at: string;
    decision_reason: string | null;
    submitted_by: string;
    manager_name: string;
    is_overdue: boolean;
    can_manager_review: boolean;
    can_admin_review: boolean;
    possible_duplicate?: boolean;
  }[];
  invitations: {
    id: number;
    directory_school_id: number;
    organization_id: number;
    assignee_user_id: number;
    status: string;
    respond_by: string;
    school_name: string;
    assigned_by: string;
    assignee_name: string;
    reason: string;
    response_reason: string | null;
    is_expired: boolean;
    can_respond: boolean;
    can_cancel: boolean;
  }[];
  extensions: {
    id: number;
    approach_registration_id: number;
    organization_id: number;
    status: string;
    school_name: string;
    requested_by: string;
    requested_until: string;
    original_protected_until: string;
    review_due_at: string;
    next_appointment_at: string;
    progress: string;
    evidence_reference: string;
    approved_until: string | null;
    next_review_at: string | null;
    decision_reason: string | null;
    is_overdue: boolean;
    is_expired: boolean;
    can_review: boolean;
  }[];
  disputes: {
    id: number;
    customer_id: number;
    organization_id: number;
    school_name: string;
    opened_by: string;
    reason: string;
    evidence_reference: string;
    status: string;
    decision: string | null;
    decision_reason: string | null;
    can_resolve: boolean;
  }[];
  deferrals: {
    id: number;
    directory_school_id: number;
    organization_id: number;
    school_name: string;
    reason: string;
    review_at: string;
    status: string;
    can_complete: boolean;
  }[];
  handovers: {
    id: number;
    user_id: number;
    user_name: string;
    reason: string;
    summary: string;
    revoked_registrations: number;
    account_suspended: boolean;
    created_at: string;
  }[];
  support_cases: {
    id: number;
    contract_id: number;
    customer_id: number;
    assigned_user_id: number;
    subject: string;
    description: string;
    customer_name: string;
    assigned_name: string;
    status: string;
    outcome: string | null;
    can_update: boolean;
    activities: {
      id: number;
      content: string;
      occurred_at: string;
      next_follow_up_at: string | null;
    }[];
  }[];
  team: {
    id: number;
    user_id: number;
    organization_id: number;
    name: string;
    membership_type: string;
    status: string;
    account_status: string;
    can_handover: boolean;
    can_reactivate?: boolean;
    can_receive_school: boolean;
    can_receive_care: boolean;
  }[];
  contracts: {
    id: number;
    contract_code: string;
    customer_id: number;
    customer_name: string;
    status: string;
    care_user_id: number | null;
    care_organization_id: number | null;
    can_assign_care: boolean;
    can_cancel: boolean;
    can_create_support?: boolean;
    care_name?: string | null;
  }[];
  policies: WorkflowPolicy[];
  receipts: {
    id: number;
    contract_id: number;
    contract_code: string;
    reference_code: string;
    amount: number;
    received_at: string;
    refunded: number;
  }[];
  refunds: {
    id: number;
    contract_id: number;
    revenue_receipt_id: number;
    amount: number;
    refunded_at: string;
    reference_code: string;
    reason: string;
    decision_reference: string;
  }[];
  imports: {
    id: number;
    created_at: string;
    schools_created: number;
    units_created: number;
    actor_name: string;
  }[];
};
export type SchoolOperationsReport = {
  period: string;
  available_schools: number;
  expired_approaches: number;
  active_contracts: number;
  collected_revenue: number | null;
  refunded_revenue: number | null;
  net_collected_revenue: number | null;
  overdue_proposals: number;
  overdue_extensions: number;
  allocation_performance: {
    assigned_by_user_id: number;
    assignee_user_id: number;
    manager_name: string;
    assignee_name: string;
    invited: number;
    accepted: number;
    declined: number;
    cancelled: number;
  }[];
};
export const workflowLabels: Record<string, string> = {
  PENDING_MANAGER: 'Chờ Quản lý',
  PENDING_ADMIN: 'Chờ Admin',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  PENDING: 'Chờ phản hồi',
  ACCEPTED: 'Đã nhận',
  DECLINED: 'Đã từ chối',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
  OPEN: 'Mới tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã hoàn tất',
  COMPLETED: 'Đã rà soát',
  ACTIVE: 'Đang áp dụng',
  DRAFT: 'Bản nháp',
  SUPERSEDED: 'Đã thay phiên bản',
  SUSPENDED: 'Ngưng hoạt động',
  REVIEW_REQUIRED: 'Cần đối soát lại',
  UPHOLD_CURRENT_RIGHTS: 'Giữ quyền hợp lệ hiện tại',
  REJECT_CLAIM: 'Bác yêu cầu tranh chấp',
};
export function workflowDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(
    new Date(
      value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z',
    ),
  );
}
export function vietnamDateTimeInput(value: string | null) {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).formatToParts(
    new Date(
      value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z',
    ),
  );
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value;
  return (
    read('year') +
    '-' +
    read('month') +
    '-' +
    read('day') +
    'T' +
    read('hour') +
    ':' +
    read('minute')
  );
}
export function workflowFormValue(
  type: string,
  value: string,
  optional = false,
): string | number | boolean | null {
  if (optional && !value.trim()) return null;
  if (type === 'number') {
    const number = Number(value);
    if (!value.trim() || !Number.isSafeInteger(number))
      throw new Error('Vui lòng nhập số nguyên hợp lệ.');
    return number;
  }
  if (type === 'boolean') {
    if (value !== 'true' && value !== 'false')
      throw new Error('Vui lòng chọn trạng thái hợp lệ.');
    return value === 'true';
  }
  if (type === 'datetime-local') {
    const date = new Date(value + '+07:00');
    if (
      Number.isNaN(date.getTime()) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value) ||
      vietnamDateTimeInput(date.toISOString()) !== value.slice(0, 16)
    )
      throw new Error('Vui lòng nhập ngày giờ hợp lệ.');
    return date.toISOString();
  }
  return value.trim();
}
