export type ChannelCustomer = {
  id: number;
  code: string;
  display_name: string;
  customer_type: 'ORGANIZATION' | 'INDIVIDUAL';
  tax_code: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  source: string | null;
  visible_status: 'AVAILABLE' | 'APPROACHING' | 'CONTRACTED';
  lifecycle_status: string;
  approach_registration_id: number | null;
  registration_status: string | null;
  owner_user_name: string | null;
  protected_until: string | null;
  next_follow_up_at: string | null;
  contract_id: number | null;
  contract_status?: string | null;
  contract_code: string | null;
  contract_value: number;
  collected_revenue: number;
  commission_accrued: number;
  reconciliation_status: string | null;
  can_manage_approach: boolean;
  can_record_revenue: boolean;
  address?: string | null;
  can_request_extension?: boolean;
  extension_pending?: boolean;
  extension_approved_count?: number;
  extension_max_count?: number | null;
  extension_unavailable_reason?: string | null;
};

export type ChannelSalesMetrics = {
  available: number;
  approaching: number;
  contracted: number;
  expiring_soon: number;
  contract_value: number;
  collected_revenue: number;
  commission_accrued: number;
};

export type ChannelSalesWorkspace = {
  capabilities?: { view_revenue: boolean; view_commission: boolean };
  data: ChannelCustomer[];
  metrics: ChannelSalesMetrics;
  pending_reconciliations: {
    id: number;
    customer_id: number;
    contract_id: number;
    status: string;
    dispute_reason: string | null;
    opened_at: string;
  }[];
  server_time: string;
};

export type RegisterApproachInput = {
  idempotency_key: string;
  customer_id?: number;
  customer_type?: 'ORGANIZATION' | 'INDIVIDUAL';
  display_name?: string;
  legal_name?: string;
  tax_code?: string;
  phone?: string;
  email?: string;
  province?: string;
  contact_name?: string;
  contact_position?: string;
  source?: string;
  note?: string;
};

export type CustomerActivityInput = {
  activity_type: 'CALL' | 'MEETING' | 'PROPOSAL' | 'NOTE' | 'ZALO' | 'DEMO';
  content: string;
  occurred_at?: string;
  contact_name?: string;
  contact_position?: string;
  feedback?: string;
  commitment?: string;
  outcome?: 'INTERESTED' | 'NEEDS_INFO' | 'DEMO_SCHEDULED' | 'WAITING' | 'DECLINED' | 'UNREACHABLE';
  evidence_reference?: string;
  next_follow_up_at?: string;
};

export type ReportContractInput = {
  idempotency_key: string;
  signed_on: string;
  service_start_on: string;
  service_end_on: string;
  payment_cycle: 'MONTHLY' | 'YEARLY';
  total_value: number;
  first_payment_due_on?: string;
  evidence_reference?: string;
  evidence_id?: number;
  installments?: {due_on:string;amount:number}[];
  service_plan?: 'SCHOOL_YEAR' | 'MONTHLY_9';
  student_count?: number;
  school_unit_ids?: number[];
  branch_count?: number;
  maintenance_fee?: number;
  setup_fee?: number;
  contract_note?: string;
};

export type RevenueReceiptInput = {
  idempotency_key: string;
  evidence_id?: number;
  amount: number;
  received_at: string;
  reference_code: string;
  payment_method: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'OTHER';
};
