export type Lead = {
  id: number;
  code: string;
  full_name: string;
  phone: string;
  source_name: string;
  status_code: string;
  status_name: string;
  status_color: string;
  course_name: string | null;
  course_id?: number | null;
  assigned_user_name: string | null;
  created_at: string;
};

export type Student = {
  id: number;
  code: string;
  full_name: string;
  school_grade: string;
  parent_name: string;
  parent_phone: string;
  class_name: string;
  status: string;
};

export type ClassRoom = {
  id: number;
  code: string;
  name: string;
  course_name: string;
  course_id?: number;
  teacher_name: string;
  capacity: number;
  enrolled_count: number;
  status: string;
  schedule?: string;
};

export type Invoice = {
  id: number;
  invoice_code: string;
  parent_name: string;
  student_name: string;
  final_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  due_at: string;
};

export const demoLeads: Lead[] = [
  [
    1,
    'LEAD00001',
    'Nguyễn Gia Hân',
    '0912 345 678',
    'Facebook',
    'NEW',
    'Mới',
    '#6C5CE7',
    'English Kids',
    'Lan Phương',
    '2026-08-29T08:10:00',
  ],
  [
    2,
    'LEAD00002',
    'Trần Minh Khang',
    '0938 222 105',
    'Zalo',
    'CONTACTED',
    'Đã liên hệ',
    '#0984E3',
    'Math Discovery',
    'Lan Phương',
    '2026-08-28T10:30:00',
  ],
  [
    3,
    'LEAD00003',
    'Lê Hoàng Nam',
    '0903 716 882',
    'Giới thiệu',
    'QUALIFIED',
    'Đủ điều kiện',
    '#00B894',
    'STEAM Explorer',
    'Lan Phương',
    '2026-08-27T14:20:00',
  ],
  [
    4,
    'LEAD00004',
    'Phạm Khánh Linh',
    '0987 420 111',
    'Website',
    'TRIAL_BOOKED',
    'Đã đặt học thử',
    '#E17055',
    'English Kids',
    'Lan Phương',
    '2026-08-26T09:15:00',
  ],
  [
    5,
    'LEAD00005',
    'Vũ Bảo Ngọc',
    '0909 102 468',
    'TikTok',
    'TRIAL_COMPLETED',
    'Đã học thử',
    '#F39C12',
    'Math Discovery',
    'Lan Phương',
    '2026-08-24T16:00:00',
  ],
  [
    6,
    'LEAD00006',
    'Đỗ Đức Anh',
    '0918 552 904',
    'Hotline',
    'CONSIDERING',
    'Đang cân nhắc',
    '#A29BFE',
    'STEAM Explorer',
    'Lan Phương',
    '2026-08-22T11:25:00',
  ],
  [
    7,
    'LEAD00007',
    'Bùi Mai Chi',
    '0935 601 933',
    'Tại trung tâm',
    'WON',
    'Đã nhập học',
    '#00A86B',
    'English Kids',
    'Lan Phương',
    '2026-08-17T17:40:00',
  ],
  [
    8,
    'LEAD00008',
    'Ngô Nhật Minh',
    '0978 003 125',
    'Facebook',
    'LOST',
    'Không chuyển đổi',
    '#B2BEC3',
    'Math Discovery',
    'Lan Phương',
    '2026-08-11T12:10:00',
  ],
].map(
  ([
    id,
    code,
    full_name,
    phone,
    source_name,
    status_code,
    status_name,
    status_color,
    course_name,
    assigned_user_name,
    created_at,
  ]) => ({
    id: id as number,
    code: code as string,
    full_name: full_name as string,
    phone: phone as string,
    source_name: source_name as string,
    status_code: status_code as string,
    status_name: status_name as string,
    status_color: status_color as string,
    course_name: course_name as string,
    assigned_user_name: assigned_user_name as string,
    course_id:
      course_name === 'English Kids'
        ? 1
        : course_name === 'Math Discovery'
          ? 2
          : 3,
    created_at: created_at as string,
  }),
);

export const demoStudents: Student[] = [
  {
    id: 1,
    code: 'HV0001',
    full_name: 'Bùi Mai Chi',
    school_grade: 'Lớp 2',
    parent_name: 'Bùi Thanh Hà',
    parent_phone: '0902 412 588',
    class_name: 'English Kids A01',
    status: 'ACTIVE',
  },
  {
    id: 2,
    code: 'HV0002',
    full_name: 'Trần Minh Quân',
    school_grade: 'Lớp 3',
    parent_name: 'Trần Quốc Huy',
    parent_phone: '0913 002 176',
    class_name: 'Math Discovery B02',
    status: 'ACTIVE',
  },
  {
    id: 3,
    code: 'HV0003',
    full_name: 'Nguyễn Hải Yến',
    school_grade: 'Lớp 1',
    parent_name: 'Nguyễn Thu Trang',
    parent_phone: '0988 551 209',
    class_name: 'English Kids A01',
    status: 'ACTIVE',
  },
  {
    id: 4,
    code: 'HV0004',
    full_name: 'Lý Tuấn Kiệt',
    school_grade: 'Lớp 2',
    parent_name: 'Lý Hoàng Sơn',
    parent_phone: '0907 430 618',
    class_name: 'Math Discovery B02',
    status: 'ACTIVE',
  },
];

export const demoClasses: ClassRoom[] = [
  {
    id: 1,
    code: 'EK-A01',
    name: 'English Kids A01',
    course_name: 'English Kids',
    course_id: 1,
    teacher_name: 'Minh Anh',
    capacity: 18,
    enrolled_count: 12,
    status: 'ACTIVE',
    schedule: 'Thứ 3 & 6 · 17:30',
  },
  {
    id: 2,
    code: 'MD-B02',
    name: 'Math Discovery B02',
    course_name: 'Math Discovery',
    course_id: 2,
    teacher_name: 'Minh Anh',
    capacity: 16,
    enrolled_count: 11,
    status: 'ACTIVE',
    schedule: 'Thứ 4 · 18:00',
  },
  {
    id: 3,
    code: 'ST-C01',
    name: 'STEAM Explorer C01',
    course_name: 'STEAM Explorer',
    course_id: 3,
    teacher_name: 'Minh Anh',
    capacity: 16,
    enrolled_count: 8,
    status: 'PLANNED',
    schedule: 'Chủ nhật · 09:00',
  },
];

export const demoInvoices: Invoice[] = [
  {
    id: 1,
    invoice_code: 'INV-2026-0001',
    parent_name: 'Bùi Thanh Hà',
    student_name: 'Bùi Mai Chi',
    final_amount: 7200000,
    paid_amount: 7200000,
    remaining_amount: 0,
    status: 'PAID',
    due_at: '2026-09-05',
  },
  {
    id: 2,
    invoice_code: 'INV-2026-0002',
    parent_name: 'Trần Quốc Huy',
    student_name: 'Trần Minh Quân',
    final_amount: 6500000,
    paid_amount: 3500000,
    remaining_amount: 3000000,
    status: 'PARTIAL',
    due_at: '2026-09-06',
  },
  {
    id: 3,
    invoice_code: 'INV-2026-0003',
    parent_name: 'Nguyễn Thu Trang',
    student_name: 'Nguyễn Hải Yến',
    final_amount: 7200000,
    paid_amount: 5000000,
    remaining_amount: 2200000,
    status: 'PARTIAL',
    due_at: '2026-09-07',
  },
  {
    id: 4,
    invoice_code: 'INV-2026-0004',
    parent_name: 'Lý Hoàng Sơn',
    student_name: 'Lý Tuấn Kiệt',
    final_amount: 6500000,
    paid_amount: 6500000,
    remaining_amount: 0,
    status: 'PAID',
    due_at: '2026-09-08',
  },
];

export const pipeline = [
  { code: 'NEW', name: 'Mới', total: 24, color: '#6C5CE7' },
  { code: 'CONTACTED', name: 'Đã liên hệ', total: 18, color: '#0984E3' },
  { code: 'TRIAL_BOOKED', name: 'Học thử', total: 9, color: '#00B894' },
  { code: 'CONSIDERING', name: 'Cân nhắc', total: 6, color: '#F39C12' },
  { code: 'WON', name: 'Đăng ký', total: 4, color: '#2F80ED' },
];

export const revenue = [
  { month: 'T4', total: 92 },
  { month: 'T5', total: 118 },
  { month: 'T6', total: 126 },
  { month: 'T7', total: 158 },
  { month: 'T8', total: 186 },
];
