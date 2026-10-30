import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, GraduationCap, BookOpenCheck, UsersRound, ShieldCheck, TrendingUp, Clock3, WalletCards, CircleDollarSign, CalendarDays, Phone, Circle } from 'lucide-react';

// Single source of truth for CRM view identifiers, sidebar entries and page copy.
// These IDs remain stable while individual roles/pages are migrated.
export type View =
  | 'dashboard'
  | 'channel-sales'
  | 'leads'
  | 'students'
  | 'classes'
  | 'finance'
  | 'admin-schools'
  | 'admin-proposals'
  | 'admin-team'
  | 'admin-capacity'
  | 'admin-policies'
  | 'admin-reports'
  | 'manager-dashboard'
  | 'manager-proposals'
  | 'manager-allocations'
  | 'manager-progress'
  | 'manager-extensions'
  | 'manager-team'
  | 'role-board-dashboard'
  | 'role-board-oversight'
  | 'role-board-overdue'
  | 'role-board-disputes'
  | 'role-board-policies'
  | 'role-accounting-dashboard'
  | 'role-accounting-revenue'
  | 'role-accounting-payments'
  | 'role-accounting-refunds'
  | 'role-accounting-reports'
  | 'role-customer-care-dashboard'
  | 'role-customer-care-handover'
  | 'role-customer-care-cases'
  | 'role-customer-care-customers'
  | 'role-customer-care-followup'
  | 'role-sales-staff-dashboard'
  | 'role-sales-staff-schools'
  | 'role-sales-staff-customers'
  | 'role-sales-staff-activities'
  | 'role-sales-staff-proposals'
  | 'role-sales-staff-income'
  | 'role-checkee-dashboard'
  | 'role-checkee-verification'
  | 'role-checkee-reconciliation'
  | 'role-checkee-disputes'
  | 'role-checkee-history'
  | 'role-collaborator-dashboard'
  | 'role-collaborator-schools'
  | 'role-collaborator-proposals'
  | 'role-collaborator-invitations'
  | 'role-collaborator-approaches'
  | 'role-collaborator-extensions'
  | 'role-collaborator-income';

export const nav: { id: View; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'admin-schools', label: 'Trường học', shortLabel: 'Trường', icon: GraduationCap },
  { id: 'admin-proposals', label: 'Đề xuất trường', shortLabel: 'Đề xuất', icon: BookOpenCheck },
  { id: 'admin-team', label: 'Nhân sự & đối tác', shortLabel: 'Nhân sự', icon: UsersRound },
  { id: 'admin-capacity', label: 'Hạn mức tiếp cận', shortLabel: 'Hạn mức', icon: UsersRound },
  { id: 'admin-policies', label: 'Chính sách vận hành', shortLabel: 'Chính sách', icon: ShieldCheck },
  { id: 'admin-reports', label: 'Báo cáo & nhật ký', shortLabel: 'Báo cáo', icon: TrendingUp },
  { id: 'role-board-dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'role-board-oversight', label: 'Báo cáo', shortLabel: 'Báo cáo', icon: TrendingUp },
  { id: 'role-board-overdue', label: 'Quá hạn', shortLabel: 'Quá hạn', icon: Clock3 },
  { id: 'role-board-disputes', label: 'Tranh chấp', shortLabel: 'Tranh chấp', icon: ShieldCheck },
  { id: 'role-board-policies', label: 'Chính sách', shortLabel: 'Chính sách', icon: BookOpenCheck },
  { id: 'role-accounting-dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'role-accounting-revenue', label: 'Doanh thu', shortLabel: 'Doanh thu', icon: WalletCards },
  { id: 'role-accounting-payments', label: 'Đối soát & phiếu chi', shortLabel: 'Đối soát & phiếu chi', icon: CircleDollarSign },
  { id: 'role-accounting-refunds', label: 'Hủy & hoàn', shortLabel: 'Hủy & hoàn', icon: ShieldCheck },
  { id: 'role-accounting-reports', label: 'Báo cáo', shortLabel: 'Báo cáo', icon: TrendingUp },
  { id: 'role-customer-care-dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'role-customer-care-handover', label: 'Trường bàn giao', shortLabel: 'Trường bàn giao', icon: GraduationCap },
  { id: 'role-customer-care-cases', label: 'Yêu cầu hỗ trợ', shortLabel: 'Yêu cầu hỗ trợ', icon: BookOpenCheck },
  { id: 'role-customer-care-customers', label: 'Khách hàng', shortLabel: 'Khách hàng', icon: UsersRound },
  { id: 'role-customer-care-followup', label: 'Theo dõi chăm sóc', shortLabel: 'Theo dõi chăm sóc', icon: CalendarDays },
  { id: 'role-sales-staff-dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'role-sales-staff-schools', label: 'Danh sách trường', shortLabel: 'Danh sách trường', icon: GraduationCap },
  { id: 'role-sales-staff-customers', label: 'Trường của tôi', shortLabel: 'Trường của tôi', icon: UsersRound },
  { id: 'role-sales-staff-activities', label: 'Tiếp cận & tư vấn', shortLabel: 'Tiếp cận & tư vấn', icon: Phone },
  { id: 'role-sales-staff-proposals', label: 'Đề xuất trường', shortLabel: 'Đề xuất trường', icon: BookOpenCheck },
  { id: 'role-sales-staff-income', label: 'Thu nhập', shortLabel: 'Thu nhập', icon: WalletCards },
  { id: 'role-checkee-dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'role-checkee-verification', label: 'Xác minh hợp đồng', shortLabel: 'Xác minh hợp đồng', icon: ShieldCheck },
  { id: 'role-checkee-reconciliation', label: 'Đối soát', shortLabel: 'Đối soát', icon: BookOpenCheck },
  { id: 'role-checkee-disputes', label: 'Tranh chấp', shortLabel: 'Tranh chấp', icon: Circle },
  { id: 'role-checkee-history', label: 'Lịch sử', shortLabel: 'Lịch sử', icon: Clock3 },
  { id: 'role-collaborator-dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'role-collaborator-schools', label: 'Đăng ký trường', shortLabel: 'Đăng ký trường', icon: GraduationCap },
  { id: 'role-collaborator-proposals', label: 'Đề xuất trường', shortLabel: 'Đề xuất trường', icon: BookOpenCheck },
  { id: 'role-collaborator-invitations', label: 'Nhận phân bổ', shortLabel: 'Nhận phân bổ', icon: UsersRound },
  { id: 'role-collaborator-approaches', label: 'Tiếp cận & tư vấn', shortLabel: 'Tiếp cận & tư vấn', icon: Phone },
  { id: 'role-collaborator-extensions', label: 'Gia hạn', shortLabel: 'Gia hạn', icon: Clock3 },
  { id: 'role-collaborator-income', label: 'Hoa hồng', shortLabel: 'Hoa hồng', icon: WalletCards },
  { id: 'manager-dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'manager-proposals', label: 'Đề xuất trường', shortLabel: 'Đề xuất', icon: BookOpenCheck },
  { id: 'manager-allocations', label: 'Phân bổ trường', shortLabel: 'Phân bổ', icon: UsersRound },
  { id: 'manager-progress', label: 'Theo dõi tiến độ', shortLabel: 'Tiến độ', icon: TrendingUp },
  { id: 'manager-extensions', label: 'Duyệt gia hạn', shortLabel: 'Gia hạn', icon: CalendarDays },
  { id: 'manager-team', label: 'Đội ngũ & báo cáo', shortLabel: 'Đội ngũ', icon: ShieldCheck },
];

export const viewCopy: Record<
  View,
  { eyebrow: string; title: string; description: string }
> = {
  dashboard: {
    eyebrow: 'Live workspace',
    title: 'Tổng quan vận hành',
    description: 'Theo dõi danh sách trường, tiếp cận, hợp đồng và quyền bảo vệ CHECKEE.',
  },
  'channel-sales': {
    eyebrow: 'CHECKEE channel sales',
    title: 'Khách hàng & quyền bảo vệ',
    description:
      'Đăng ký tiếp cận, báo hợp đồng và theo dõi doanh thu — hoa hồng.',
  },
  'admin-schools': { eyebrow: 'Quản trị danh bạ', title: 'Quản lý trường học', description: 'Trường chính, phân hiệu và nhập dữ liệu.' },
  'admin-proposals': { eyebrow: 'Quản trị đề xuất', title: 'Đề xuất & phê duyệt', description: 'Theo dõi đề xuất trường mới và quyết định duyệt.' },
  'admin-team': { eyebrow: 'Tổ chức & nhân sự', title: 'Nhân sự & đối tác', description: 'Quản lý CTV, nhân viên và đối tác bán hàng.' },
  'admin-reports': { eyebrow: 'Báo cáo CRM', title: 'Giám sát vận hành', description: 'Theo dõi các chỉ số kinh doanh theo phân quyền.' },
  'admin-capacity': { eyebrow: 'Quản trị / Hạn mức tiếp cận', title: 'Quản lý hạn mức tiếp cận', description: 'Quản lý giới hạn trường đang tiếp cận của Nhân viên và CTV.' },
  'admin-policies': { eyebrow: 'Quản trị / Chính sách vận hành', title: 'Quản lý chính sách vận hành', description: 'Xem phiên bản chính sách và thời hạn xử lý theo quy định.' },
  'role-board-dashboard': {eyebrow:'Ban giám đốc',title:'Tổng quan',description:'Giám sát kết quả, theo dõi hồ sơ và phê duyệt theo thẩm quyền.'},
  'role-board-oversight': {eyebrow:'Ban giám đốc',title:'Báo cáo',description:'Giám sát kết quả, theo dõi hồ sơ và phê duyệt theo thẩm quyền.'},
  'role-board-overdue': {eyebrow:'Ban giám đốc',title:'Quá hạn',description:'Giám sát kết quả, theo dõi hồ sơ và phê duyệt theo thẩm quyền.'},
  'role-board-disputes': {eyebrow:'Ban giám đốc',title:'Tranh chấp',description:'Giám sát kết quả, theo dõi hồ sơ và phê duyệt theo thẩm quyền.'},
  'role-board-policies': {eyebrow:'Ban giám đốc',title:'Chính sách',description:'Giám sát kết quả, theo dõi hồ sơ và phê duyệt theo thẩm quyền.'},
  'role-accounting-dashboard': {eyebrow:'Kế toán',title:'Tổng quan',description:'Theo dõi doanh thu, đối soát và chứng từ tài chính theo phân quyền.'},
  'role-accounting-revenue': {eyebrow:'Kế toán',title:'Doanh thu',description:'Theo dõi doanh thu, đối soát và chứng từ tài chính theo phân quyền.'},
  'role-accounting-payments': {eyebrow:'Kế toán',title:'Đối soát & phiếu chi',description:'Theo dõi doanh thu, đối soát và chứng từ tài chính theo phân quyền.'},
  'role-accounting-refunds': {eyebrow:'Kế toán',title:'Hủy & hoàn',description:'Theo dõi doanh thu, đối soát và chứng từ tài chính theo phân quyền.'},
  'role-accounting-reports': {eyebrow:'Kế toán',title:'Báo cáo',description:'Theo dõi doanh thu, đối soát và chứng từ tài chính theo phân quyền.'},
  'role-customer-care-dashboard': {eyebrow:'Chăm sóc khách hàng',title:'Tổng quan',description:'Tiếp nhận trường bàn giao và theo dõi hỗ trợ sau bán.'},
  'role-customer-care-handover': {eyebrow:'Chăm sóc khách hàng',title:'Trường bàn giao',description:'Tiếp nhận trường bàn giao và theo dõi hỗ trợ sau bán.'},
  'role-customer-care-cases': {eyebrow:'Chăm sóc khách hàng',title:'Yêu cầu hỗ trợ',description:'Tiếp nhận trường bàn giao và theo dõi hỗ trợ sau bán.'},
  'role-customer-care-customers': {eyebrow:'Chăm sóc khách hàng',title:'Khách hàng',description:'Tiếp nhận trường bàn giao và theo dõi hỗ trợ sau bán.'},
  'role-customer-care-followup': {eyebrow:'Chăm sóc khách hàng',title:'Theo dõi chăm sóc',description:'Tiếp nhận trường bàn giao và theo dõi hỗ trợ sau bán.'},
  'role-sales-staff-dashboard': {eyebrow:'Nhân viên bán hàng',title:'Tổng quan',description:'Tiếp cận trường, ghi nhận hoạt động và theo dõi công việc được giao.'},
  'role-sales-staff-schools': {eyebrow:'Nhân viên bán hàng',title:'Danh sách trường',description:'Tiếp cận trường, ghi nhận hoạt động và theo dõi công việc được giao.'},
  'role-sales-staff-customers': {eyebrow:'Nhân viên bán hàng',title:'Trường của tôi',description:'Tiếp cận trường, ghi nhận hoạt động và theo dõi công việc được giao.'},
  'role-sales-staff-activities': {eyebrow:'Nhân viên bán hàng',title:'Tiếp cận & tư vấn',description:'Tiếp cận trường, ghi nhận hoạt động và theo dõi công việc được giao.'},
  'role-sales-staff-proposals': {eyebrow:'Nhân viên bán hàng',title:'Đề xuất trường',description:'Tiếp cận trường, ghi nhận hoạt động và theo dõi công việc được giao.'},
  'role-sales-staff-income': {eyebrow:'Nhân viên bán hàng',title:'Thu nhập',description:'Tiếp cận trường, ghi nhận hoạt động và theo dõi công việc được giao.'},
  'role-checkee-dashboard': {eyebrow:'CHECKEE',title:'Tổng quan',description:'Xác minh hợp đồng, đối soát và theo dõi hồ sơ CHECKEE.'},
  'role-checkee-verification': {eyebrow:'CHECKEE',title:'Xác minh hợp đồng',description:'Xác minh hợp đồng, đối soát và theo dõi hồ sơ CHECKEE.'},
  'role-checkee-reconciliation': {eyebrow:'CHECKEE',title:'Đối soát',description:'Xác minh hợp đồng, đối soát và theo dõi hồ sơ CHECKEE.'},
  'role-checkee-disputes': {eyebrow:'CHECKEE',title:'Tranh chấp',description:'Xác minh hợp đồng, đối soát và theo dõi hồ sơ CHECKEE.'},
  'role-checkee-history': {eyebrow:'CHECKEE',title:'Lịch sử',description:'Xác minh hợp đồng, đối soát và theo dõi hồ sơ CHECKEE.'},
  'role-collaborator-dashboard': {eyebrow:'Cộng tác viên',title:'Tổng quan',description:'Đăng ký trường, tư vấn, gia hạn và theo dõi quyền lợi cá nhân.'},
  'role-collaborator-schools': {eyebrow:'Cộng tác viên',title:'Đăng ký trường',description:'Đăng ký trường, tư vấn, gia hạn và theo dõi quyền lợi cá nhân.'},
  'role-collaborator-proposals': {eyebrow:'Cộng tác viên',title:'Đề xuất trường',description:'Đăng ký trường, tư vấn, gia hạn và theo dõi quyền lợi cá nhân.'},
  'role-collaborator-invitations': {eyebrow:'Cộng tác viên',title:'Nhận phân bổ',description:'Đăng ký trường, tư vấn, gia hạn và theo dõi quyền lợi cá nhân.'},
  'role-collaborator-approaches': {eyebrow:'Cộng tác viên',title:'Tiếp cận & tư vấn',description:'Đăng ký trường, tư vấn, gia hạn và theo dõi quyền lợi cá nhân.'},
  'role-collaborator-extensions': {eyebrow:'Cộng tác viên',title:'Gia hạn',description:'Đăng ký trường, tư vấn, gia hạn và theo dõi quyền lợi cá nhân.'},
  'role-collaborator-income': {eyebrow:'Cộng tác viên',title:'Hoa hồng',description:'Đăng ký trường, tư vấn, gia hạn và theo dõi quyền lợi cá nhân.'},
  'manager-dashboard': { eyebrow:'Quản lý bán hàng',title:'Tổng quan đội ngũ',description:'Giám sát đề xuất, phân bổ và gia hạn theo phạm vi được phân quyền.' },
  'manager-proposals': { eyebrow:'Quản lý bán hàng',title:'Đề xuất trường',description:'Tiếp nhận, kiểm tra và chuyển hồ sơ đề xuất đến Admin.' },
  'manager-allocations': { eyebrow:'Quản lý bán hàng',title:'Phân bổ trường',description:'Theo dõi lời mời và phản hồi nhận trường.' },
  'manager-progress': { eyebrow:'Quản lý bán hàng',title:'Theo dõi tiến độ',description:'Theo dõi tiến độ tiếp cận và hiệu quả phân bổ.' },
  'manager-extensions': { eyebrow:'Quản lý bán hàng',title:'Duyệt gia hạn',description:'Xem tiến độ và bằng chứng, duyệt hoặc từ chối gia hạn.' },
  'manager-team': { eyebrow:'Quản lý bán hàng',title:'Đội ngũ & báo cáo',description:'Theo dõi kết quả phân bổ và nhân sự được quản lý.' },
  leads: {
    eyebrow: 'Sales pipeline',
    title: 'Lead & tư vấn',
    description: 'Theo dõi từng cơ hội từ lần chạm đầu tiên đến khi nhập học.',
  },
  students: {
    eyebrow: 'Student 360°',
    title: 'Hồ sơ học viên',
    description: 'Thông tin học viên, phụ huynh và lớp đang theo học.',
  },
  classes: {
    eyebrow: 'Academic ops',
    title: 'Lớp học',
    description: 'Sĩ số, lịch học và trạng thái lớp tại trung tâm.',
  },
  finance: {
    eyebrow: 'Finance desk',
    title: 'Học phí & công nợ',
    description: 'Theo dõi hóa đơn và khoản phải thu rõ ràng, chính xác.',
  },
};

