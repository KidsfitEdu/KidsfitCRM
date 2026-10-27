import type { ChannelSalesWorkspace } from './channel-sales';

// Public presentation fixtures, NOT credentials or authorization for the real API.
export const DEMO_PASSWORD = 'Demo@2026';
export const DEMO_SESSION_KEY = 'kidsfit_demo_profile_v1';

export type DemoAccount = {
  id: string;
  email: string;
  name: string;
  roleLabel: string;
  description: string;
  abilities: string[];
};

const educationRead = [
  'crm.dashboard.view',
  'crm.lead.view',
  'student.view',
  'course.view',
  'payment.view',
  'crm.report.view',
];
const salesActions = [
  'channel_sales.customer.view',
  'channel_sales.approach.register',
  'channel_sales.activity.create',
  'channel_sales.contract.report',
  'channel_sales.commission.view',
];
const channelAdmin = [
  ...salesActions,
  'channel_sales.revenue.record',
  'channel_sales.reconcile',
  'channel_sales.manage',
  'channel_sales.scope.organization',
  'channel_sales.scope.all',
  'channel_sales.payout.create',
  'channel_sales.payout.approve',
  'channel_sales.payout.complete',
  'channel_sales.policy.manage',
  'channel_sales.team.manage',
  'channel_sales.identity.manage',
  'channel_sales.commission.adjust',
  'channel_sales.school.directory.manage',
  'channel_sales.school.capacity.manage',
  'channel_sales.school.contract.review',
  'channel_sales.school.protection.grant',
];

const schoolManagerAbilities = [
  'channel_sales.school.proposal.review',
  'channel_sales.school.allocation.manage',
  'channel_sales.school.extension.review',
  'channel_sales.school.handover.manage',
  'channel_sales.school.care.assign',
];
const schoolAbilitiesByProfile: Record<string, string[]> = {
  admin: [
    ...schoolManagerAbilities,
    'channel_sales.school.proposal.submit',
    'channel_sales.school.dispute.resolve',
    'channel_sales.school.escalation.resolve',
    'channel_sales.school.support.manage',
    'channel_sales.school.workflow_policy.manage',
    'channel_sales.contract.cancel',
    'channel_sales.revenue.refund',
  ],
  board: [
    'channel_sales.school.dispute.resolve',
    'channel_sales.school.escalation.resolve',
  ],
  accountant: ['channel_sales.contract.cancel', 'channel_sales.revenue.refund'],
  manager: schoolManagerAbilities,
  care: ['channel_sales.school.support.manage'],
  sales: ['channel_sales.school.proposal.submit'],
  checkee: [],
  partner: schoolManagerAbilities,
  ctv: ['channel_sales.school.proposal.submit'],
};

export const demoAccounts: DemoAccount[] = [
  {
    id: 'admin',
    email: 'admin@demo.kidsfit.example',
    name: 'Minh Anh',
    roleLabel: 'Quản trị viên',
    description: 'Khám phá toàn bộ giao diện và thao tác mẫu.',
    abilities: [
      ...educationRead,
      'crm.lead.create',
      'crm.lead.update',
      'crm.lead.assign',
      'student.update',
      'course.manage',
      'payment.create',
      ...channelAdmin,
    ],
  },
  {
    id: 'board',
    email: 'board@demo.kidsfit.example',
    name: 'Ban Giám đốc',
    roleLabel: 'Ban giám đốc',
    description: 'Xem dữ liệu CHECKEE mẫu, không chỉnh sửa.',
    abilities: [
      'channel_sales.customer.view',
      'channel_sales.commission.view',
      'channel_sales.scope.all',
    ],
  },
  {
    id: 'accountant',
    email: 'accountant@demo.kidsfit.example',
    name: 'Kế toán',
    roleLabel: 'Kế toán',
    description: 'Xem và thử ghi nhận doanh thu CHECKEE.',
    abilities: [
      'channel_sales.customer.view',
      'channel_sales.revenue.record',
      'channel_sales.commission.view',
      'channel_sales.scope.organization',
      'channel_sales.payout.create',
      'channel_sales.payout.approve',
      'channel_sales.payout.complete',
      'channel_sales.commission.adjust',
    ],
  },
  {
    id: 'manager',
    email: 'manager@demo.kidsfit.example',
    name: 'Quản lý bán hàng',
    roleLabel: 'Quản lý bán hàng',
    description: 'Theo dõi và thử quy trình tiếp cận khách hàng.',
    abilities: [
      ...salesActions,
      'channel_sales.manage',
      'channel_sales.scope.organization',
      'channel_sales.school.contract.review',
    ],
  },
  {
    id: 'care',
    email: 'care@demo.kidsfit.example',
    name: 'Chăm sóc khách hàng',
    roleLabel: 'Chăm sóc khách hàng',
    description: 'Xem khách hàng và ghi nhận hoạt động hỗ trợ.',
    abilities: [
      'channel_sales.customer.view',
      'channel_sales.activity.create',
      'channel_sales.scope.organization',
    ],
  },
  {
    id: 'sales',
    email: 'sales@demo.kidsfit.example',
    name: 'Lan Phương',
    roleLabel: 'Nhân viên bán hàng',
    description: 'Đăng ký khách hàng, theo dõi hợp đồng sản phẩm iSchool, F&B.',
    abilities: [
      ...educationRead,
      'crm.lead.create',
      'crm.lead.update',
      'crm.lead.assign',
      ...salesActions,
    ],
  },
  {
    id: 'checkee',
    email: 'checkee@demo.kidsfit.example',
    name: 'CHECKEE',
    roleLabel: 'CHECKEE',
    description: 'Xem khách hàng mẫu; không xem hoa hồng nội bộ.',
    abilities: [
      'channel_sales.customer.view',
      'channel_sales.reconcile',
      'channel_sales.scope.organization',
    ],
  },
  {
    id: 'partner',
    email: 'partner@demo.kidsfit.example',
    name: 'Đối tác triển khai',
    roleLabel: 'Đối tác triển khai',
    description: 'Khám phá góc nhìn đối tác bán hàng.',
    abilities: [
      ...salesActions,
      'channel_sales.manage',
      'channel_sales.scope.organization',
      'channel_sales.team.manage',
      'channel_sales.policy.manage',
      'channel_sales.school.contract.review',
    ],
  },
  {
    id: 'ctv',
    email: 'ctv@demo.kidsfit.example',
    name: 'Cộng tác viên',
    roleLabel: 'CTV đối tác',
    description: 'Thử đăng ký tiếp cận và theo dõi khách hàng mẫu.',
    abilities: [...salesActions],
  },
].map((account) => ({
  ...account,
  abilities: [
    ...new Set([
      ...account.abilities,
      ...(schoolAbilitiesByProfile[account.id] ?? []),
    ]),
  ],
}));

// Public-facing alias only; preserve legacy credentials and session IDs.
export function demoLoginEmail(account: DemoAccount): string {
  return account.email.replace('@demo.', '@');
}

export function authenticateDemo(
  email: string,
  password: string,
): DemoAccount | null {
  if (password !== DEMO_PASSWORD) return null;
  return (
    demoAccounts.find(
      (account) =>
        account.email === email.trim().toLowerCase() ||
        demoLoginEmail(account) === email.trim().toLowerCase(),
    ) ?? null
  );
}

type DemoStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readDemoSession(storage: DemoStorage): DemoAccount | null {
  try {
    const id = storage.getItem(DEMO_SESSION_KEY);
    // Never trust stored names, abilities, passwords or a real API token.
    return demoAccounts.find((account) => account.id === id) ?? null;
  } catch {
    return null;
  }
}

export function saveDemoSession(
  storage: DemoStorage,
  account: DemoAccount | null,
): void {
  try {
    if (account) storage.setItem(DEMO_SESSION_KEY, account.id);
    else storage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Storage may be disabled. The in-memory demo still works without persistence.
  }
}

export function presentDemoWorkspace(
  workspace: ChannelSalesWorkspace,
  account: DemoAccount,
): ChannelSalesWorkspace {
  const commission = account.abilities.includes(
    'channel_sales.commission.view',
  );
  const revenue =
    commission || account.abilities.includes('channel_sales.revenue.record');
  return {
    ...workspace,
    capabilities: { view_revenue: revenue, view_commission: commission },
    metrics: {
      ...workspace.metrics,
      collected_revenue: revenue ? workspace.metrics.collected_revenue : 0,
      commission_accrued: commission ? workspace.metrics.commission_accrued : 0,
    },
    data: workspace.data.map((customer) => ({
      ...customer,
      collected_revenue: revenue ? customer.collected_revenue : 0,
      commission_accrued: commission ? customer.commission_accrued : 0,
    })),
  };
}
