/** UI page descriptions from the role-workspaces on develop.
 * These are presentation profiles, NOT backend authorization roles.
 * Preserve panel/tab semantics and order during the stage-3 migration.
 */
export const rolePageSections = {
  Board: {
    dashboard: {label:"Tổng quan",panel:"dashboard",tab:""},
    oversight: {label:"Giám sát & báo cáo",panel:"operations",tab:"report"},
    overdue: {label:"Hồ sơ quá hạn",panel:"operations",tab:"proposals"},
    disputes: {label:"Tranh chấp",panel:"operations",tab:"disputes"},
    policies: {label:"Chính sách",panel:"operations",tab:"policies"},
  },
  Accounting: {
    dashboard: {label:"Tổng quan",panel:"dashboard",tab:""},
    revenue: {label:"Doanh thu",panel:"finance",tab:""},
    payments: {label:"Đối soát & phiếu chi",panel:"finance",tab:""},
    refunds: {label:"Hủy & hoàn",panel:"operations",tab:"finance"},
    reports: {label:"Báo cáo",panel:"finance",tab:""},
  },
  CustomerCare: {
    dashboard: {label:"Tổng quan",panel:"dashboard",tab:""},
    handover: {label:"Trường bàn giao",panel:"operations",tab:"care"},
    cases: {label:"Yêu cầu hỗ trợ",panel:"operations",tab:"care"},
    customers: {label:"Khách hàng",panel:"customers",tab:""},
    followup: {label:"Theo dõi chăm sóc",panel:"operations",tab:"care"},
  },
  SalesStaff: {
    dashboard: {label:"Tổng quan",panel:"dashboard",tab:""},
    schools: {label:"Danh sách trường",panel:"schools",tab:""},
    customers: {label:"Trường của tôi",panel:"customers",tab:""},
    activities: {label:"Tiếp cận & tư vấn",panel:"customers",tab:""},
    proposals: {label:"Đề xuất trường",panel:"operations",tab:"proposals"},
    income: {label:"Thu nhập",panel:"finance",tab:""},
  },
  Checkee: {
    dashboard: {label:"Tổng quan",panel:"dashboard",tab:""},
    verification: {label:"Xác minh hợp đồng",panel:"reconciliation",tab:""},
    reconciliation: {label:"Đối soát",panel:"reconciliation",tab:""},
    disputes: {label:"Tranh chấp",panel:"reconciliation",tab:""},
    history: {label:"Lịch sử",panel:"reconciliation",tab:""},
  },
  Collaborator: {
    dashboard: {label:"Tổng quan",panel:"dashboard",tab:""},
    schools: {label:"Đăng ký trường",panel:"schools",tab:""},
    proposals: {label:"Đề xuất trường",panel:"operations",tab:"proposals"},
    invitations: {label:"Nhận phân bổ",panel:"operations",tab:"invitations"},
    approaches: {label:"Tiếp cận & tư vấn",panel:"customers",tab:""},
    extensions: {label:"Gia hạn",panel:"operations",tab:"extensions"},
    income: {label:"Hoa hồng",panel:"finance",tab:""},
  },
} as const;

export const managerPageSections = {
  SalesManager: {
    dashboard: {label:"Tổng quan",panel:"dashboard",tab:""},
    proposals: {label:"Đề xuất",panel:"proposals",tab:""},
    allocations: {label:"Phân bổ",panel:"invitations",tab:""},
    progress: {label:"Tiến độ",panel:"report",tab:""},
    extensions: {label:"Gia hạn",panel:"extensions",tab:""},
    team: {label:"Đội ngũ",panel:"report",tab:""},
  },
} as const;

export type RolePageGroup = keyof typeof rolePageSections;
export type ManagerPageSection = keyof typeof managerPageSections.SalesManager;
