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
  contract_code: string | null;
  contract_value: number;
  collected_revenue: number;
  commission_accrued: number;
  reconciliation_status: string | null;
  can_manage_approach: boolean;
  can_record_revenue: boolean;
};

export type CheckeePackage = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  list_price: number;
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
  packages: CheckeePackage[];
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
  activity_type: 'CALL' | 'MEETING' | 'PROPOSAL' | 'NOTE';
  content: string;
  next_follow_up_at?: string;
};

export type ReportContractInput = {
  idempotency_key: string;
  contract_code: string;
  signed_on: string;
  product_package_id: number;
  total_value: number;
  first_payment_due_on?: string;
  evidence_reference?: string;
};

export type RevenueReceiptInput = {
  idempotency_key: string;
  amount: number;
  received_at: string;
  reference_code: string;
  payment_method: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'OTHER';
};

export const demoChannelSalesWorkspace: ChannelSalesWorkspace = {
  data: [
    {
      id: 1,
      code: 'CUS-00001',
      display_name: 'Trung tâm Mầm non Mặt Trời',
      customer_type: 'ORGANIZATION',
      tax_code: '0319001001',
      phone: '0901 111 222',
      email: 'hello@mattroi.example',
      contact_name: 'Nguyễn Hoàng Mai',
      source: 'CHECKEE_DIRECTORY',
      visible_status: 'AVAILABLE',
      lifecycle_status: 'PROSPECT',
      approach_registration_id: null,
      registration_status: null,
      owner_user_name: null,
      protected_until: null,
      next_follow_up_at: null,
      contract_id: null,
      contract_code: null,
      contract_value: 0,
      collected_revenue: 0,
      commission_accrued: 0,
      reconciliation_status: null,
      can_manage_approach: false,
      can_record_revenue: false,
    },
    {
      id: 2,
      code: 'CUS-00002',
      display_name: 'Hệ thống Anh ngữ BlueSky',
      customer_type: 'ORGANIZATION',
      tax_code: '0319001002',
      phone: '0902 222 333',
      email: null,
      contact_name: 'Trần Thanh Tùng',
      source: 'REFERRAL',
      visible_status: 'APPROACHING',
      lifecycle_status: 'PROSPECT',
      approach_registration_id: 2,
      registration_status: 'ACTIVE',
      owner_user_name: 'Lan Phương',
      protected_until: new Date(Date.now() + 3 * 86400000).toISOString(),
      next_follow_up_at: new Date(Date.now() + 86400000).toISOString(),
      contract_id: null,
      contract_code: null,
      contract_value: 0,
      collected_revenue: 0,
      commission_accrued: 0,
      reconciliation_status: null,
      can_manage_approach: true,
      can_record_revenue: false,
    },
    {
      id: 3,
      code: 'CUS-00003',
      display_name: 'Trường Mầm non Happy House',
      customer_type: 'ORGANIZATION',
      tax_code: '0319001003',
      phone: '0903 333 444',
      email: null,
      contact_name: 'Lê Thu Hương',
      source: 'PARTNER_EVENT',
      visible_status: 'CONTRACTED',
      lifecycle_status: 'CONTRACTED',
      approach_registration_id: 3,
      registration_status: 'CONVERTED',
      owner_user_name: 'Lan Phương',
      protected_until: new Date(
        new Date().setFullYear(new Date().getFullYear() + 5),
      ).toISOString(),
      next_follow_up_at: null,
      contract_id: 1,
      contract_code: 'CHK-2026-0001',
      contract_value: 30000000,
      collected_revenue: 15000000,
      commission_accrued: 1500000,
      reconciliation_status: 'PENDING',
      can_manage_approach: false,
      can_record_revenue: true,
    },
  ],
  metrics: {
    available: 1,
    approaching: 1,
    contracted: 1,
    expiring_soon: 0,
    contract_value: 30000000,
    collected_revenue: 15000000,
    commission_accrued: 1500000,
  },
  packages: [
    {
      id: 1,
      code: 'CHECKEE_START',
      name: 'CHECKEE Start',
      description: 'Gói khởi động cho đơn vị quy mô nhỏ',
      list_price: 12000000,
    },
    {
      id: 2,
      code: 'CHECKEE_GROWTH',
      name: 'CHECKEE Growth',
      description: 'Gói vận hành và mở rộng đội ngũ',
      list_price: 30000000,
    },
    {
      id: 3,
      code: 'CHECKEE_ENTERPRISE',
      name: 'CHECKEE Enterprise',
      description: 'Gói tùy chỉnh cho chuỗi và doanh nghiệp',
      list_price: 60000000,
    },
  ],
  pending_reconciliations: [],
  server_time: new Date().toISOString(),
};
