import type {
  SchoolOperationsWorkspace,
  SchoolOperationsReport,
} from './school-operations';

// Fictional, read-only fixtures. No source documents, API sessions, or customer records.
export function schoolOperationsPreview(
  abilities: string[],
  now = new Date(),
): SchoolOperationsWorkspace {
  const has = (code: string) => abilities.includes(code);
  const all = has('channel_sales.scope.all');
  const sales = has('channel_sales.approach.register');
  const manager =
    has('channel_sales.school.allocation.manage') ||
    has('channel_sales.manage');
  const care =
    has('channel_sales.school.support.manage') ||
    has('channel_sales.school.care.assign') ||
    all;
  const at = (hours: number) =>
    new Date(now.getTime() + hours * 3600000).toISOString();
  return {
    server_time: now.toISOString(),
    user_id: 1,
    organizations: [{ id: 1, name: 'Khu vực minh họa' }],
    proposals:
      sales || all
        ? [
            {
              id: 1,
              organization_id: 1,
              school_code: 'SCH-M-004',
              name: 'Trường Mầm non Cầu Vồng',
              province: 'Khu vực minh họa',
              ward: 'Phường A',
              address: null,
              contact_name: null,
              contact_position: null,
              contact_phone: null,
              email: null,
              reason: 'Bổ sung trường mới để mở rộng khu vực tiếp cận.',
              status: 'PENDING_MANAGER',
              review_due_at: at(-2),
              decision_reason: null,
              submitted_by: 'CTV khu vực',
              manager_name: 'Quản lý khu vực',
              is_overdue: true,
              can_manager_review: false,
              can_admin_review: false,
            },
          ]
        : [],
    invitations:
      sales || manager || all
        ? [
            {
              id: 1,
              directory_school_id: 1,
              organization_id: 1,
              assignee_user_id: 1,
              status: 'PENDING',
              respond_by: at(8),
              school_name: 'Trường Mầm non Ánh Dương',
              assigned_by: 'Quản lý khu vực',
              assignee_name: 'CTV khu vực',
              reason: 'Gần địa bàn phụ trách, phù hợp lịch tư vấn.',
              response_reason: null,
              is_expired: false,
              can_respond: false,
              can_cancel: false,
            },
          ]
        : [],
    extensions:
      sales || manager || all
        ? [
            {
              id: 1,
              approach_registration_id: 1,
              organization_id: 1,
              status: 'PENDING',
              school_name: 'Trường Mầm non Mây Xanh',
              requested_by: 'CTV khu vực',
              requested_until: at(168),
              original_protected_until: at(24),
              review_due_at: at(-1),
              next_appointment_at: at(18),
              progress:
                'Nhà trường đã nhận tư vấn và hẹn buổi giới thiệu sản phẩm.',
              evidence_reference: 'Biên bản hẹn giới thiệu sản phẩm',
              approved_until: null,
              next_review_at: null,
              decision_reason: null,
              is_overdue: true,
              is_expired: false,
              can_review: false,
            },
          ]
        : [],
    disputes:
      all || manager || has('channel_sales.reconcile')
        ? [
            {
              id: 1,
              customer_id: 1002,
              organization_id: 1,
              school_name: 'Trường Mầm non Mây Xanh',
              opened_by: 'CTV khu vực',
              reason: 'Đề nghị kiểm tra mốc hết hạn và lần đăng ký tiếp theo.',
              evidence_reference: 'Lịch sử tiếp cận',
              status: 'OPEN',
              decision: null,
              decision_reason: null,
              can_resolve: false,
            },
          ]
        : [],
    deferrals:
      manager || all
        ? [
            {
              id: 1,
              directory_school_id: 1,
              organization_id: 1,
              school_name: 'Trường Mầm non Ánh Dương',
              reason: 'Ưu tiên tư vấn từ xa, chờ nhân sự phù hợp khu vực.',
              review_at: at(72),
              status: 'OPEN',
              can_complete: false,
            },
          ]
        : [],
    handovers: [],
    support_cases: care
      ? [
          {
            id: 1,
            contract_id: 3001,
            customer_id: 1003,
            assigned_user_id: 1,
            subject: 'Hướng dẫn triển khai iSchool',
            description:
              'Chuẩn bị tài khoản, thống nhất lịch đào tạo và bàn giao các cam kết khi ký.',
            customer_name: 'Trường Mầm non Hạt Nắng',
            assigned_name: 'Nhân viên CSKH',
            status: 'IN_PROGRESS',
            outcome: null,
            can_update: false,
            activities: [
              {
                id: 1,
                content: 'Đã tiếp nhận hồ sơ và xác nhận lịch hướng dẫn.',
                occurred_at: at(-6),
                next_follow_up_at: at(24),
              },
            ],
          },
        ]
      : [],
    team:
      manager || all
        ? [
            {
              id: 1,
              user_id: 1,
              organization_id: 1,
              name: 'CTV khu vực',
              membership_type: 'COLLABORATOR',
              status: 'ACTIVE',
              account_status: 'ACTIVE',
              can_handover: false,
              can_receive_school: false,
              can_receive_care: false,
            },
          ]
        : [],
    contracts: [
      {
        id: 3001,
        contract_code: 'CHK-2026-001',
        customer_id: 1003,
        customer_name: 'Trường Mầm non Hạt Nắng',
        status: 'ACTIVE',
        care_user_id: 1,
        care_organization_id: 1,
        can_assign_care: false,
        can_cancel: false,
      },
    ],
    policies: [
      {
        id: 1,
        organization_id: 1,
        version: 1,
        status: 'DRAFT',
        manager_review_hours: 24,
        admin_review_hours: 48,
        invitation_hours: 24,
        max_extension_days: 7,
        max_extension_count: 2,
        max_total_extension_days: 14,
        decision_reference: 'Đề xuất chờ duyệt',
      },
    ],
    receipts: has('channel_sales.commission.view')
      ? [
          {
            id: 1,
            contract_id: 3001,
            contract_code: 'CHK-2026-001',
            reference_code: 'PT-M-001',
            amount: 12000000,
            received_at: at(-48),
            refunded: 0,
          },
        ]
      : [],
    refunds: [],
    imports: [],
  };
}
export function schoolOperationsReportPreview(): SchoolOperationsReport {
  return {
    period: '2026-10',
    available_schools: 8,
    expired_approaches: 3,
    active_contracts: 12,
    collected_revenue: null,
    refunded_revenue: null,
    net_collected_revenue: null,
    overdue_proposals: 1,
    overdue_extensions: 1,
    allocation_performance: [
      {
        assigned_by_user_id: 1,
        assignee_user_id: 1,
        manager_name: 'Quản lý khu vực',
        assignee_name: 'CTV khu vực',
        invited: 5,
        accepted: 3,
        declined: 1,
        cancelled: 0,
      },
    ],
  };
}
