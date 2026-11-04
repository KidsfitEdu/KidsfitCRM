import { trainingSchools } from './ten-school-fixtures.ts';
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
  address?: string | null;
  can_request_extension?: boolean;
  extension_pending?: boolean;
  extension_approved_count?: number;
  extension_max_count?: number | null;
  extension_unavailable_reason?: string | null;
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
  contract_code: string;
  signed_on: string;
  product_package_id: number;
  total_value: number;
  first_payment_due_on?: string;
  evidence_reference?: string;
  evidence_id?: number;
  installments?: {due_on:string;amount:number}[];
  service_plan?: 'SCHOOL_YEAR' | 'MONTHLY_9';
  student_count?: number;
  school_unit_ids?: number[];
};

export type RevenueReceiptInput = {
  idempotency_key: string;
  evidence_id?: number;
  amount: number;
  received_at: string;
  reference_code: string;
  payment_method: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'OTHER';
};

export const demoChannelSalesWorkspace: ChannelSalesWorkspace = {
  data: trainingSchools.map((school,index):ChannelCustomer=>{
    const contracted=school.contractStage==='ACTIVE';
    const pendingContract=school.contractStage!==null&&!contracted;
    const protectedUntil=contracted?new Date(Date.now()+365*5*86400000).toISOString()
      :school.stage==='APPROACHING'&&!pendingContract?new Date(Date.now()+3*86400000).toISOString():null;
    const amount=contracted?(index===0?30000000:18000000):pendingContract?(index===2?24000000:12000000):0;
    return {
      id:index+1, code:'SCH-TRAIN-'+school.code, display_name:school.name,
      customer_type:'ORGANIZATION',tax_code:null,phone:null,email:null,contact_name:null,
      source:'SCHOOL_DIRECTORY',visible_status:school.stage,lifecycle_status:contracted?'CONTRACTED':'PROSPECT',
      approach_registration_id:school.stage==='AVAILABLE'?null:index+100,
      registration_status:school.stage==='AVAILABLE'?null:school.contractStage?'CONVERTED':'ACTIVE',
      owner_user_name:school.owner,protected_until:protectedUntil,
      next_follow_up_at:!school.contractStage&&school.stage==='APPROACHING'
        ?new Date(Date.now()+86400000).toISOString():null,
      contract_id:school.contractStage?index+3001:null,
      contract_code:school.contractStage?'CHK-2026-'+school.code.slice(3):null,
      contract_value:amount,
      collected_revenue:contracted?(index===0?12000000:6000000):0,
      commission_accrued:0,
      reconciliation_status:contracted||index===2?'CONFIRMED':index===3?'PENDING':null,
      can_manage_approach:false,can_record_revenue:false,
    };
  }),
  metrics: {
    available: 2,
    approaching: 6,
    contracted: 2,
    expiring_soon: 2,
    contract_value: 108000000,
    collected_revenue: 18000000,
    commission_accrued: 0,
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
