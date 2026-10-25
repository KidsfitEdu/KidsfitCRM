// Fictional, read-only presentation fixtures. Never read the user's source workbook.
const names = [
  'Trường Mầm non Ánh Dương',
  'Trường Mầm non Mây Xanh',
  'Trường Mầm non Hạt Nắng',
];

export async function readSchoolDemo<T>(path: string): Promise<T> {
  const now = new Date();
  const approachUntil = new Date(now.getTime() + 3 * 86400000).toISOString();
  const verifiedAt = new Date(now.getTime() - 30 * 86400000);
  const protectionUntil = new Date(verifiedAt);
  protectionUntil.setUTCFullYear(protectionUntil.getUTCFullYear() + 5);
  const schools = names.map((display_name, index) => ({
    id: index + 1,
    customer_id: index + 1001,
    school_code: `SCH-00${index + 1}`,
    display_name,
    province: 'Khu vực minh họa',
    ward: ['Phường A', 'Phường B', 'Phường C'][index],
    branches: [2, 1, 0][index],
    visible_status: ['AVAILABLE', 'APPROACHING', 'CONTRACTED'][index],
    protected_until:
      index === 1
        ? approachUntil
        : index === 2
          ? protectionUntil.toISOString()
          : null,
    can_register: false,
    contract_id: index === 2 ? 3001 : null,
    contract_status: index === 2 ? 'ACTIVE' : null,
  }));
  const url = new URL(path, 'https://demo.invalid');
  if (url.pathname === '/school-capacities')
    return {
      data: [
        {
          id: 1,
          name: 'CTV minh họa',
          organization_name: 'Đối tác triển khai',
          school_approach_limit: 10,
          active: 1,
          history: [],
        },
      ],
    } as T;
  if (url.pathname === '/schools') {
    const normalize = (value: string) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('vi');
    const term = normalize(url.searchParams.get('search') ?? '');
    const filtered = schools.filter((s) =>
      normalize(
        `${s.display_name} ${s.school_code} ${s.ward} ${s.province}`,
      ).includes(term),
    );
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    return {
      data: filtered.slice((page - 1) * 20, page * 20),
      total: filtered.length,
      page,
      page_size: 20,
    } as T;
  }
  const match = url.pathname.match(/^\/schools\/(\d+)$/);
  const school = match
    ? schools.find((s) => s.id === Number(match[1]))
    : undefined;
  if (!school) throw new Error('Chức năng này cần bản CRM kết nối API.');
  return {
    id: school.id,
    school_code: school.school_code,
    customer_id: school.customer_id,
    display_name: school.display_name,
    registration_id: null,
    protected_until: school.protected_until,
    can_report_contract: false,
    can_activity: false,
    packages: [],
    units: Array.from({ length: school.branches + 1 }, (_, index) => ({
      id: school.id * 10 + index,
      unit_type: index === 0 ? 'MAIN' : 'BRANCH',
      name: index === 0 ? school.display_name : `Phân hiệu ${index}`,
      province: school.province,
      ward: school.ward,
      address: null,
      contact_name: 'Đầu mối minh họa',
      contact_position: 'Đại diện trường',
      contact_phone: null,
      school_phone: null,
      email: null,
      note: 'Dữ liệu giả lập, không phải thông tin liên hệ thật.',
    })),
    contracts: school.contract_id
      ? [
          {
            id: 3001,
            contract_code: 'CHK-2026-001',
            status: 'ACTIVE',
            verified_at: verifiedAt.toISOString(),
            protection_until: protectionUntil.toISOString(),
            can_review: false,
            can_grant: false,
          },
        ]
      : [],
    activities:
      school.id === 2
        ? [
            {
              activity_type: 'DEMO',
              content:
                'Minh họa: đã giới thiệu CHECKEE và thống nhất lịch trình diễn tiếp theo.',
              created_at: now.toISOString(),
              next_follow_up_at: approachUntil,
            },
          ]
        : [],
  } as T;
}
