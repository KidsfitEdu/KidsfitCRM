export type FinanceWorkspace = {
  personnel_types?: string[];
  period: string;
  summary: {
    accrued: number;
    eligible: number;
    approved: number;
    paid: number;
    withholding: number;
    take_home: number;
    collected_revenue: number;
    refunded_revenue: number;
    net_collected_revenue: number;
  };
  ledger_total: number;
  ledger: {
    id: number;
    contract_id: number;
    contract_code: string;
    beneficiary_user_id: number;
    beneficiary_name: string;
    beneficiary_organization_id: number;
    period: string;
    entry_type: string;
    amount: number;
    calculation_base: number;
    rate_percent: number;
    policy_code: string;
    occurred_at: string;
    payout_status: string;
    reconciliation_status: string | null;
    reason: string | null;
    related_entry_id: number | null;
  }[];
  payouts: {
    id: number;
    organization_id: number;
    beneficiary_user_id: number;
    beneficiary_name: string;
    code: string;
    period: string;
    gross_amount: number;
    withholding_amount: number;
    withholding_reason: string | null;
    net_amount: number;
    status: string;
    paid_at: string | null;
    payment_reference: string | null;
    events: { event_type: string; created_at: string; reason: string | null }[];
  }[];
  policies: {
    id: number;
    organization_id: number;
    code: string;
    name: string;
    rate_percent: number;
    effective_from: string;
    effective_until: string | null;
    status: string;
    personnel_type?: string | null;
  }[];
  organizations: {
    id: number;
    code: string;
    name: string;
    commission_rate_ceiling: number;
  }[];
};

export type ReconciliationItem = {
  id: number;
  customer_id: number;
  customer_name: string;
  tax_code: string | null;
  contract_id: number;
  contract_code: string;
  signed_on: string;
  total_value: number;
  protection_until: string | null;
  contract_status: string;
  owner_name: string;
  status: string;
  dispute_reason: string | null;
  opened_at: string;
  can_reconcile: boolean;
  events: {
    id: number;
    event_type: string;
    reason: string | null;
    created_at: string;
  }[];
};

export type ChannelManagement = {
  team: {
    id: number;
    user_id: number;
    organization_id: number;
    organization_name: string;
    name: string;
    email: string;
    membership_type: string;
    status: string;
    can_change_status: boolean;
  }[];
  organizations: { id: number; code: string; name: string }[];
  roles: { code: string; name: string }[];
};

export type ChannelCustomerDetail = {
  data: {
    id: number;
    display_name: string;
    tax_code: string | null;
    phone: string | null;
    email: string | null;
    contact_name: string | null;
    lifecycle_status: string;
  };
  contracts: {
    id: number;
    contract_code: string;
    signed_on: string;
    status: string;
    protection_until: string;
    evidence_reference: string | null;
    total_value: number | null;
  }[];
  activities: {
    id: number;
    activity_type: string;
    content: string;
    next_follow_up_at: string | null;
    created_at: string;
    user_name: string;
  }[];
  can_record_support: boolean;
};

export const channelQueryKeys = {
  all: ['channel-sales'] as const,
  finance: (period: string) => ['channel-sales', 'finance', period] as const,
  reconciliation: ['channel-sales', 'reconciliation'] as const,
  management: ['channel-sales', 'management'] as const,
  detail: (id: number | null) => ['channel-sales', 'detail', id] as const,
};

export async function channelRequest<T>(
  base: string,
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${base}/channel-sales${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };
  if (!response.ok) {
    const firstError = payload.errors
      ? Object.values(payload.errors).flat()[0]
      : null;
    throw new Error(
      String(firstError ?? payload.message ?? 'Không thể hoàn tất yêu cầu.'),
    );
  }
  return payload as T;
}

export const channelMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
export const channelDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(
        new Date(
          value.includes('T')
            ? `${value}${value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? '' : 'Z'}`
            : value,
        ),
      )
    : '—';
export const currentBusinessPeriod = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;
};
