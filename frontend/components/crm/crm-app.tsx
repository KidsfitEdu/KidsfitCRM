'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  lazy,
  Suspense,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import {
  ArrowUpRight,
  Bell,
  BookOpenCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  CircleDollarSign,
  Clock3,
  Download,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DemoAccess } from '@/components/crm/demo-access';
import { presentDemoWorkspace, type DemoAccount } from '@/lib/demo-auth';
import { ChannelSalesView } from '@/components/crm/channel-sales-view';
import {
  demoChannelSalesWorkspace,
  type ChannelCustomer,
  type ChannelSalesWorkspace,
  type CustomerActivityInput,
  type RegisterApproachInput,
  type ReportContractInput,
  type RevenueReceiptInput,
} from '@/lib/channel-sales';
import {
  demoClasses,
  demoInvoices,
  demoLeads,
  demoStudents,
  pipeline as demoPipeline,
  revenue,
  type ClassRoom,
  type Invoice,
  type Lead,
  type Student,
} from '@/lib/crm-data';

type View =
  | 'dashboard'
  | 'channel-sales'
  | 'leads'
  | 'students'
  | 'classes'
  | 'finance'
  | 'admin-schools'
  | 'admin-proposals'
  | 'admin-team'
  | 'admin-settings'
  | 'admin-reports';
const ChannelOperations = lazy(() =>
  import('@/components/crm/channel-operations').then((module) => ({
    default: module.ChannelOperations,
  })),
);
type Catalog = {
  id: number;
  code: string;
  name: string;
  course_id?: number;
  course_name?: string;
  capacity?: number;
  tuition_fee?: number | string;
};
type Task = {
  id: number;
  title: string;
  due_at: string;
  priority: string;
  done?: boolean;
};
type TrialInput = {
  course_id: number;
  class_id: number;
  scheduled_at: string;
  note: string;
};
type TrialOutcomeInput = {
  result: 'INTERESTED' | 'NEEDS_CONSIDERATION' | 'NOT_INTERESTED';
  note: string;
};
type ConversionInput = {
  idempotency_key: string;
  parent: {
    full_name: string;
    phone: string;
    email?: string;
  };
  student: {
    full_name: string;
    date_of_birth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    school_name?: string;
    school_grade?: string;
  };
  relationship: 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';
  class_id: number;
  discount_amount: number;
};
type PaymentInput = {
  idempotency_key: string;
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
};

const apiBase =
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '');

const nav: { id: View; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'channel-sales', label: 'CHECKEE Sales', shortLabel: 'CHECKEE', icon: ShieldCheck },
  { id: 'admin-schools', label: 'Quản lý trường học', shortLabel: 'Trường', icon: GraduationCap },
  { id: 'admin-proposals', label: 'Đề xuất & phê duyệt', shortLabel: 'Duyệt', icon: BookOpenCheck },
  { id: 'admin-team', label: 'Nhân sự & đối tác', shortLabel: 'Nhân sự', icon: UsersRound },
  { id: 'admin-reports', label: 'Báo cáo', shortLabel: 'Báo cáo', icon: TrendingUp },
  { id: 'admin-settings', label: 'Cấu hình hệ thống', shortLabel: 'Cấu hình', icon: ShieldCheck },
];

const viewCopy: Record<
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
  'admin-settings': { eyebrow: 'Thiết lập CRM', title: 'Cấu hình hệ thống', description: 'Quản trị chính sách và hạn mức nghiệp vụ.' },
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

const defaultTasks: Task[] = [
  {
    id: 1,
    title: 'Gọi lại phụ huynh Gia Hân',
    due_at: '09:00',
    priority: 'HIGH',
  },
  {
    id: 2,
    title: 'Xác nhận lịch học thử Khánh Linh',
    due_at: '15:30',
    priority: 'HIGH',
  },
  {
    id: 3,
    title: 'Gửi chương trình Math Discovery',
    due_at: '17:00',
    priority: 'MEDIUM',
  },
];

const money = (value: number | string) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value));
const compactMoney = (value: number) =>
  `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)}M`;
const initials = (name: string) =>
  name
    .split(' ')
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
const todayLabel = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date());

async function request<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string[]>;
  };
  const firstError = payload.errors
    ? Object.values(payload.errors).flat()[0]
    : undefined;
  if (!response.ok)
    throw new Error(
      firstError ?? payload.message ?? 'Không thể kết nối máy chủ.',
    );
  return payload as T;
}

export function CrmApp() {
  if (apiBase) return <CrmWorkspace />;
  return (
    <DemoAccess>
      {(account, logout) => (
        <CrmWorkspace
          key={account.id}
          demoAccount={account}
          onDemoLogout={logout}
        />
      )}
    </DemoAccess>
  );
}

function CrmWorkspace({
  demoAccount,
  onDemoLogout,
}: {
  demoAccount?: DemoAccount;
  onDemoLogout?: () => void;
}) {
  const [view, setView] = useState<View>(
    demoAccount && !demoAccount.abilities.includes('crm.dashboard.view')
      ? 'channel-sales'
      : 'dashboard',
  );
  const [search, setSearch] = useState('');
  const [dark, setDark] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [trialLead, setTrialLead] = useState<Lead | null>(null);
  const [trialOutcomeLead, setTrialOutcomeLead] = useState<Lead | null>(null);
  const [conversionLead, setConversionLead] = useState<Lead | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [notice, setNotice] = useState('');
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(!apiBase);
  const [userName, setUserName] = useState(demoAccount?.name ?? 'Minh Anh');
  const [abilities, setAbilities] = useState<string[]>(
    demoAccount?.abilities ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>(demoLeads);
  const [students, setStudents] = useState<Student[]>(demoStudents);
  const [classes, setClasses] = useState<ClassRoom[]>(demoClasses);
  const [invoices, setInvoices] = useState<Invoice[]>(demoInvoices);
  const [channelSales, setChannelSales] = useState<ChannelSalesWorkspace>(
    demoChannelSalesWorkspace,
  );
  const [tasks, setTasks] = useState<Task[]>(defaultTasks);
  const [pipeline, setPipeline] = useState(demoPipeline);
  const [metrics, setMetrics] = useState({
    new_leads: 24,
    follow_ups_due: 8,
    trials_today: 5,
    revenue_month: 186000000,
    outstanding: 5200000,
    active_students: 48,
    active_classes: 3,
  });
  const [sources, setSources] = useState<Catalog[]>([
    { id: 1, code: 'FACEBOOK', name: 'Facebook' },
    { id: 2, code: 'ZALO', name: 'Zalo' },
    { id: 3, code: 'WEBSITE', name: 'Website' },
  ]);
  const [courses, setCourses] = useState<Catalog[]>([
    {
      id: 1,
      code: 'ENGLISH_KIDS',
      name: 'English Kids',
      tuition_fee: 7200000,
    },
    {
      id: 2,
      code: 'MATH_DISCOVERY',
      name: 'Math Discovery',
      tuition_fee: 6500000,
    },
    {
      id: 3,
      code: 'STEAM_EXPLORER',
      name: 'STEAM Explorer',
      tuition_fee: 5800000,
    },
  ]);
  const [classOptions, setClassOptions] = useState<Catalog[]>(
    demoClasses.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      course_id: item.course_id,
      course_name: item.course_name,
      capacity: item.capacity,
    })),
  );

  useEffect(() => {
    if (!apiBase) return;
    const saved = sessionStorage.getItem('kidsfit_token') ?? '';
    setToken(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    return () => document.documentElement.classList.remove('dark');
  }, [dark]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadWorkspace = useCallback(async (accessToken: string) => {
    if (!apiBase || !accessToken) return;
    setLoading(true);
    try {
      const me = await request<{
        user: { name: string; abilities: string[] };
      }>('/me', accessToken);
      const has = (ability: string) => me.user.abilities.includes(ability);
      const [
        dashboard,
        leadData,
        studentData,
        classData,
        invoiceData,
        catalogs,
        channelSalesData,
      ] = await Promise.all([
        has('crm.dashboard.view')
          ? request<{
              metrics: typeof metrics;
              pipeline: typeof demoPipeline;
              tasks: Task[];
            }>('/dashboard', accessToken)
          : Promise.resolve(null),
        has('crm.lead.view')
          ? request<{ data: Lead[] }>('/leads?per_page=100', accessToken)
          : Promise.resolve(null),
        has('student.view')
          ? request<{ data: Student[] }>('/students', accessToken)
          : Promise.resolve(null),
        has('course.view')
          ? request<{ data: ClassRoom[] }>('/classes', accessToken)
          : Promise.resolve(null),
        has('payment.view')
          ? request<{ data: Invoice[] }>('/invoices', accessToken)
          : Promise.resolve(null),
        has('crm.lead.view') || has('course.view')
          ? request<{
              lead_sources: Catalog[];
              courses: Catalog[];
              classes: Catalog[];
            }>('/catalogs', accessToken)
          : Promise.resolve(null),
        has('channel_sales.customer.view')
          ? request<ChannelSalesWorkspace>(
              '/channel-sales/workspace',
              accessToken,
            )
          : Promise.resolve(null),
      ]);
      setUserName(me.user.name);
      setAbilities(me.user.abilities);
      if (!has('crm.dashboard.view') && has('channel_sales.customer.view'))
        setView('channel-sales');
      if (dashboard) {
        setMetrics(dashboard.metrics);
        setPipeline(dashboard.pipeline);
        setTasks(dashboard.tasks);
      }
      if (leadData) setLeads(leadData.data);
      if (studentData) setStudents(studentData.data);
      if (classData) setClasses(classData.data);
      if (invoiceData) setInvoices(invoiceData.data);
      if (catalogs) {
        setSources(catalogs.lead_sources);
        setCourses(catalogs.courses);
        setClassOptions(catalogs.classes);
      }
      if (channelSalesData) setChannelSales(channelSalesData);
    } catch (error) {
      sessionStorage.removeItem('kidsfit_token');
      setToken('');
      setNotice(
        error instanceof Error ? error.message : 'Phiên đăng nhập đã hết hạn.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace(token);
  }, [token, loadWorkspace]);

  const filteredLeads = useMemo(() => {
    const term = search.toLocaleLowerCase('vi');
    return leads.filter((lead) =>
      [lead.full_name, lead.phone, lead.code, lead.course_name].some((value) =>
        value?.toLocaleLowerCase('vi').includes(term),
      ),
    );
  }, [leads, search]);

  const onLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await request<{
        token: string;
        user: { name: string; abilities: string[] };
      }>('/login', undefined, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          device_name: 'Kidsfit CRM Web',
        }),
      });
      sessionStorage.setItem('kidsfit_token', result.token);
      setUserName(result.user.name);
      setAbilities(result.user.abilities);
      setToken(result.token);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (onDemoLogout) {
      onDemoLogout();
      return;
    }
    if (token)
      await request('/logout', token, { method: 'POST' }).catch(
        () => undefined,
      );
    sessionStorage.removeItem('kidsfit_token');
    setToken('');
    setAbilities([]);
  };

  const addLead = async (input: {
    full_name: string;
    phone: string;
    source_id: number;
    interested_course_id: number;
    note: string;
  }) => {
    if (apiBase && token) {
      const response = await request<{ data: Lead }>('/leads', token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setLeads((current) => [response.data, ...current]);
    } else {
      const source = sources.find((item) => item.id === input.source_id);
      const course = courses.find(
        (item) => item.id === input.interested_course_id,
      );
      setLeads((current) => [
        {
          id: Date.now(),
          code: `LEAD${String(current.length + 1).padStart(5, '0')}`,
          full_name: input.full_name,
          phone: input.phone,
          source_name: source?.name ?? 'Khác',
          status_code: 'NEW',
          status_name: 'Mới',
          status_color: '#6C5CE7',
          course_name: course?.name ?? null,
          assigned_user_name: userName,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
      setMetrics((current) => ({
        ...current,
        new_leads: current.new_leads + 1,
      }));
    }
    setAddOpen(false);
    setNotice('Đã thêm lead mới vào pipeline.');
    setView('leads');
  };

  const advanceLead = async (lead: Lead) => {
    if (lead.status_code === 'QUALIFIED') {
      setTrialLead(lead);
      return;
    }
    if (lead.status_code === 'CONSIDERING') {
      setConversionLead(lead);
      return;
    }
    if (lead.status_code === 'TRIAL_BOOKED') {
      setTrialOutcomeLead(lead);
      return;
    }

    const transitions: Record<string, [string, string, string]> = {
      NEW: ['CONTACTED', 'Đã liên hệ', '#0984E3'],
      CONTACTED: ['QUALIFIED', 'Đủ điều kiện', '#00B894'],
      TRIAL_COMPLETED: ['CONSIDERING', 'Đang cân nhắc', '#A29BFE'],
      LOST: ['NEW', 'Mới', '#6C5CE7'],
    };
    const next = transitions[lead.status_code];
    if (!next)
      return setNotice(
        'Lead này cần quy trình nhập học hoặc lý do đóng riêng.',
      );
    if (apiBase && token)
      await request(`/leads/${lead.id}/status`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: next[0] }),
      });
    setLeads((items) =>
      items.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              status_code: next[0],
              status_name: next[1],
              status_color: next[2],
            }
          : item,
      ),
    );
    setNotice(`Đã chuyển ${lead.full_name} sang “${next[1]}”.`);
  };

  const bookTrial = async (lead: Lead, input: TrialInput) => {
    if (apiBase && token) {
      await request(`/leads/${lead.id}/trial`, token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await loadWorkspace(token);
    } else {
      setLeads((items) =>
        items.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                status_code: 'TRIAL_BOOKED',
                status_name: 'Đã đặt học thử',
                status_color: '#E17055',
              }
            : item,
        ),
      );
      setMetrics((current) => ({
        ...current,
        trials_today: current.trials_today + 1,
      }));
    }
    setTrialLead(null);
    setNotice(`Đã đặt lịch học thử cho ${lead.full_name}.`);
  };

  const convertLead = async (lead: Lead, input: ConversionInput) => {
    if (apiBase && token) {
      await request(`/leads/${lead.id}/convert`, token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await loadWorkspace(token);
    } else {
      const classRoom = classes.find((item) => item.id === input.class_id);
      const course = courses.find((item) => item.id === classRoom?.course_id);
      const finalAmount =
        Number(course?.tuition_fee ?? 0) - input.discount_amount;
      const studentId = Math.max(0, ...students.map((item) => item.id)) + 1;
      const invoiceId = Math.max(0, ...invoices.map((item) => item.id)) + 1;

      setLeads((items) =>
        items.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                status_code: 'WON',
                status_name: 'Đã nhập học',
                status_color: '#00A86B',
              }
            : item,
        ),
      );
      setStudents((items) => [
        ...items,
        {
          id: studentId,
          code: `HV${String(studentId).padStart(5, '0')}`,
          full_name: input.student.full_name,
          school_grade: input.student.school_grade ?? 'Chưa cập nhật',
          parent_name: input.parent.full_name,
          parent_phone: input.parent.phone,
          class_name: classRoom?.name ?? 'Chưa xếp lớp',
          status: 'ACTIVE',
        },
      ]);
      setInvoices((items) => [
        {
          id: invoiceId,
          invoice_code: `INV-2026-${String(invoiceId).padStart(5, '0')}`,
          parent_name: input.parent.full_name,
          student_name: input.student.full_name,
          final_amount: finalAmount,
          paid_amount: 0,
          remaining_amount: finalAmount,
          status: finalAmount === 0 ? 'PAID' : 'UNPAID',
          due_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
        ...items,
      ]);
      setClasses((items) =>
        items.map((item) =>
          item.id === input.class_id
            ? { ...item, enrolled_count: Number(item.enrolled_count) + 1 }
            : item,
        ),
      );
      setMetrics((current) => ({
        ...current,
        active_students: current.active_students + 1,
        outstanding: current.outstanding + finalAmount,
      }));
    }
    setConversionLead(null);
    setNotice(`Đã nhập học và tạo hóa đơn cho ${input.student.full_name}.`);
  };

  const completeTrial = async (lead: Lead, input: TrialOutcomeInput) => {
    if (apiBase && token) {
      await request(`/leads/${lead.id}/trial/complete`, token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await loadWorkspace(token);
    } else {
      setLeads((items) =>
        items.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                status_code: 'TRIAL_COMPLETED',
                status_name: 'Đã học thử',
                status_color: '#F39C12',
              }
            : item,
        ),
      );
    }
    setTrialOutcomeLead(null);
    setNotice(`Đã ghi nhận kết quả học thử của ${lead.full_name}.`);
  };

  const recordPayment = async (invoice: Invoice, input: PaymentInput) => {
    if (apiBase && token) {
      await request(`/invoices/${invoice.id}/payments`, token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await loadWorkspace(token);
    } else {
      setInvoices((items) =>
        items.map((item) => {
          if (item.id !== invoice.id) return item;
          const paidAmount = Number(item.paid_amount) + input.amount;
          const remainingAmount = Number(item.final_amount) - paidAmount;
          return {
            ...item,
            paid_amount: paidAmount,
            remaining_amount: remainingAmount,
            status: remainingAmount === 0 ? 'PAID' : 'PARTIAL',
          };
        }),
      );
      setMetrics((current) => ({
        ...current,
        revenue_month: current.revenue_month + input.amount,
        outstanding: current.outstanding - input.amount,
      }));
    }
    setPaymentInvoice(null);
    setNotice(`Đã ghi nhận thanh toán cho ${invoice.invoice_code}.`);
  };

  const completeTask = async (taskId: number) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.done) return;
    try {
      if (apiBase && token) {
        await request(`/tasks/${taskId}/complete`, token, { method: 'PATCH' });
      }
      setTasks((items) =>
        items.map((item) =>
          item.id === taskId ? { ...item, done: true } : item,
        ),
      );
      setNotice('Đã hoàn thành công việc theo dõi.');
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : 'Không thể hoàn thành công việc.',
      );
    }
  };

  const refreshChannelSales = async () => {
    if (!apiBase || !token) return;
    setChannelSales(
      await request<ChannelSalesWorkspace>('/channel-sales/workspace', token),
    );
  };

  const registerApproach = async (input: RegisterApproachInput) => {
    if (apiBase && token) {
      await request('/channel-sales/approach-registrations', token, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await refreshChannelSales();
    } else {
      const now = new Date();
      const protectedUntil = new Date(
        now.getTime() + 120 * 3600000,
      ).toISOString();
      setChannelSales((current) => {
        const existing = current.data.find(
          (item) => item.id === input.customer_id,
        );
        const row: ChannelCustomer = existing
          ? {
              ...existing,
              visible_status: 'APPROACHING',
              approach_registration_id: Date.now(),
              registration_status: 'ACTIVE',
              owner_user_name: userName,
              protected_until: protectedUntil,
              can_manage_approach: true,
            }
          : {
              id: Date.now(),
              code: `CUS-${Date.now()}`,
              display_name: input.display_name ?? 'Khách hàng mới',
              customer_type: input.customer_type ?? 'ORGANIZATION',
              tax_code: input.tax_code ?? null,
              phone: input.phone ?? null,
              email: input.email ?? null,
              contact_name: input.contact_name ?? null,
              source: input.source ?? null,
              visible_status: 'APPROACHING',
              lifecycle_status: 'PROSPECT',
              approach_registration_id: Date.now(),
              registration_status: 'ACTIVE',
              owner_user_name: userName,
              protected_until: protectedUntil,
              next_follow_up_at: null,
              contract_id: null,
              contract_code: null,
              contract_value: 0,
              collected_revenue: 0,
              commission_accrued: 0,
              reconciliation_status: null,
              can_manage_approach: true,
              can_record_revenue: false,
            };
        return {
          ...current,
          data: existing
            ? current.data.map((item) => (item.id === row.id ? row : item))
            : [row, ...current.data],
          metrics: {
            ...current.metrics,
            available: Math.max(
              0,
              current.metrics.available - (existing ? 1 : 0),
            ),
            approaching: current.metrics.approaching + 1,
          },
        };
      });
    }
    setNotice('Đã xác lập quyền tiếp cận khách hàng trong 5 ngày.');
  };

  const addCustomerActivity = async (
    customer: ChannelCustomer,
    input: CustomerActivityInput,
  ) => {
    if (!customer.approach_registration_id)
      throw new Error('Khách hàng chưa có lượt tiếp cận đang hoạt động.');
    if (apiBase && token) {
      await request(
        `/channel-sales/approach-registrations/${customer.approach_registration_id}/activities`,
        token,
        { method: 'POST', body: JSON.stringify(input) },
      );
      await refreshChannelSales();
    } else {
      setChannelSales((current) => ({
        ...current,
        data: current.data.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                next_follow_up_at: input.next_follow_up_at ?? null,
              }
            : item,
        ),
      }));
    }
    setNotice('Đã cập nhật lịch sử tiếp cận, thời hạn bảo vệ không đổi.');
  };

  const reportChannelContract = async (
    customer: ChannelCustomer,
    input: ReportContractInput,
  ) => {
    if (!customer.approach_registration_id)
      throw new Error('Khách hàng chưa có lượt tiếp cận hợp lệ.');
    if (apiBase && token) {
      await request(
        `/channel-sales/approach-registrations/${customer.approach_registration_id}/report-contract`,
        token,
        { method: 'POST', body: JSON.stringify(input) },
      );
      await refreshChannelSales();
    } else {
      const protection = new Date(input.signed_on);
      protection.setFullYear(protection.getFullYear() + 5);
      setChannelSales((current) => ({
        ...current,
        data: current.data.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                visible_status: 'CONTRACTED',
                lifecycle_status: 'CONTRACTED',
                registration_status: 'CONVERTED',
                contract_id: Date.now(),
                contract_code: input.contract_code,
                contract_value: input.total_value,
                protected_until: protection.toISOString(),
                reconciliation_status: 'PENDING',
                can_manage_approach: false,
                can_record_revenue: true,
              }
            : item,
        ),
        metrics: {
          ...current.metrics,
          approaching: Math.max(0, current.metrics.approaching - 1),
          contracted: current.metrics.contracted + 1,
          contract_value: current.metrics.contract_value + input.total_value,
        },
      }));
    }
    setNotice(
      'Đã gửi báo cáo hợp đồng. Hồ sơ trường học cần hoàn tất xác minh tại mục Trường học.',
    );
  };

  const recordChannelRevenue = async (
    customer: ChannelCustomer,
    input: RevenueReceiptInput,
  ) => {
    if (!customer.contract_id) throw new Error('Khách hàng chưa có hợp đồng.');
    if (apiBase && token) {
      await request(
        `/channel-sales/contracts/${customer.contract_id}/revenue-receipts`,
        token,
        { method: 'POST', body: JSON.stringify(input) },
      );
      await refreshChannelSales();
    } else {
      const commission = Math.round(input.amount * 0.1);
      setChannelSales((current) => ({
        ...current,
        data: current.data.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                collected_revenue: item.collected_revenue + input.amount,
                commission_accrued: item.commission_accrued + commission,
              }
            : item,
        ),
        metrics: {
          ...current.metrics,
          collected_revenue: current.metrics.collected_revenue + input.amount,
          commission_accrued: current.metrics.commission_accrued + commission,
        },
      }));
    }
    setNotice('Đã ghi nhận doanh thu và bút toán hoa hồng tương ứng.');
  };

  const exportInvoices = () => {
    const rows = [
      ['Mã hóa đơn', 'Phụ huynh', 'Học viên', 'Phải thu', 'Đã thu', 'Còn lại'],
      ...invoices.map((item) => [
        item.invoice_code,
        item.parent_name,
        item.student_name,
        item.final_amount,
        item.paid_amount,
        item.remaining_amount,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.join(',')).join('\n')}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    link.download = 'kidsfit-cong-no.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice('Đã xuất báo cáo công nợ CSV.');
  };

  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Đang khởi tạo workspace…
      </div>
    );
  if (apiBase && !token)
    return <LoginScreen loading={loading} onLogin={onLogin} />;

  const activeCopy = viewCopy[view];
  const can = (ability: string) =>
    abilities.includes('*') || abilities.includes(ability);
  const visibleNav = nav.filter((item) => {
    if (item.id === 'dashboard') return can('channel_sales.customer.view');
    if (item.id === 'channel-sales') return can('channel_sales.customer.view');
    if (item.id === 'admin-schools') return can('channel_sales.school.directory.manage');
    if (item.id === 'admin-proposals') return can('channel_sales.school.directory.manage');
    if (item.id === 'admin-team') return can('channel_sales.team.manage');
    if (item.id === 'admin-reports') return can('channel_sales.customer.view');
    if (item.id === 'admin-settings') return can('channel_sales.school.workflow.policy.manage');
    return false;
  });
  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-white/10 bg-[#152238] text-white lg:flex">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#8d7cf6] shadow-[0_10px_30px_rgba(141,124,246,.35)]">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-[17px] font-bold tracking-[-0.02em]">
              Kidsfit CRM
            </p>
            <p className="text-xs text-slate-400">Giáo dục & CHECKEE</p>
          </div>
        </div>
        <nav className="mt-5 space-y-1 px-3" aria-label="Điều hướng chính">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all ${view === item.id ? 'bg-white/10 font-semibold text-white shadow-inner shadow-white/5' : 'text-slate-300 hover:bg-white/7 hover:text-white'}`}
            >
              <item.icon
                className={`size-[18px] ${view === item.id ? 'text-[#a99df8]' : ''}`}
              />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mx-4 mt-auto mb-3 rounded-2xl border border-white/10 bg-white/6 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              CRM trường học
            </span>
            <span className="text-xs text-[#b9afff]">CHECKEE</span>
          </div>
          
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Quản lý dữ liệu trường, quyền tiếp cận và hợp đồng
          </p>
        </div>
        <div className="mx-4 mb-5 flex items-center gap-3 rounded-xl p-2">
          <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-xs font-bold text-[#633b38]">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="text-[11px] text-slate-400">
              {demoAccount?.roleLabel ?? 'Kết nối MySQL'}
            </p>
          </div>
          {(apiBase || demoAccount) && (
            <button
              onClick={logout}
              aria-label="Đăng xuất"
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </aside>

      <div className="pb-20 lg:pl-[248px] lg:pb-0">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl sm:px-8">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {todayLabel}
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-[-0.03em] sm:text-xl">
              Chào buổi sáng, {userName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 w-64 rounded-xl bg-card pl-9"
                placeholder="Tìm kiếm nhanh…"
              />
            </div>
            <Button
              onClick={() => setDark((value) => !value)}
              variant="outline"
              size="icon"
              aria-label="Đổi giao diện"
              className="rounded-xl"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Thông báo"
              className="relative rounded-xl"
            >
              <Bell />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#f46f64] ring-2 ring-background" />
            </Button>
            <div className="ml-1 grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-sm font-bold text-[#633b38]">
              {initials(userName)}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1480px] space-y-7 px-5 py-7 sm:px-8">
          {demoAccount && (
            <aside className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
              <div>
                <p className="font-semibold">
                  Không gian trải nghiệm · {demoAccount.roleLabel}
                </p>
                <p className="mt-1 text-xs leading-5 opacity-80">
                  Dữ liệu mẫu dùng chung để minh họa. Quyền chỉ mô phỏng trên
                  giao diện, không phải bảo mật thật. Đăng xuất sẽ xóa thay đổi
                  thử.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="shrink-0"
              >
                <LogOut className="size-4" /> Đổi tài khoản
              </Button>
            </aside>
          )}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge className="mb-3 bg-[#e9e6ff] text-[#6558d3] hover:bg-[#e9e6ff] dark:bg-[#6558d3]/20 dark:text-[#c6beff]">
                {activeCopy.eyebrow}
              </Badge>
              <h2 className="text-3xl font-bold tracking-[-0.045em]">
                {activeCopy.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeCopy.description}
              </p>
            </div>
            <div className="flex gap-2">
              {view === 'finance' && (
                <Button
                  onClick={exportInvoices}
                  variant="outline"
                  size="lg"
                  className="h-11 rounded-xl"
                >
                  <Download /> Xuất báo cáo
                </Button>
              )}
              {false && view !== 'channel-sales' && can('crm.lead.create') && (
                <Button
                  onClick={() => setAddOpen(true)}
                  size="lg"
                  className="h-11 rounded-xl bg-[#6558d3] px-4 shadow-[0_10px_24px_rgba(101,88,211,.22)] hover:bg-[#594cc8]"
                >
                  <Plus /> Thêm lead mới
                </Button>
              )}
            </div>
          </section>

          {loading ? (
            <LoadingGrid />
          ) : (
            <>
              {view === 'dashboard' && <SchoolDashboard workspace={channelSales} />}
              {view === 'channel-sales' && (
                <Suspense fallback={<LoadingGrid />}>
                  <ChannelOperations
                    apiBase={apiBase}
                    token={token}
                    abilities={abilities}
                    onChanged={refreshChannelSales}
                    customerView={(onOpenCustomer) => (
                      <ChannelSalesView
                        onOpenCustomer={onOpenCustomer}
                        workspace={
                          demoAccount
                            ? presentDemoWorkspace(channelSales, demoAccount)
                            : channelSales
                        }
                        search={search}
                        setSearch={setSearch}
                        canRegister={can('channel_sales.approach.register')}
                        canAddActivity={can('channel_sales.activity.create')}
                        canReportContract={can('channel_sales.contract.report')}
                        canRecordRevenue={can('channel_sales.revenue.record')}
                        onRegister={registerApproach}
                        onAddActivity={addCustomerActivity}
                        onReportContract={reportChannelContract}
                        onRecordRevenue={recordChannelRevenue}
                      />
                    )}
                  />
                </Suspense>
              )}
              {(['admin-schools', 'admin-proposals', 'admin-team', 'admin-reports', 'admin-settings'] as View[]).includes(view) && (
                <Suspense fallback={<LoadingGrid />}>
                  <ChannelOperations
                    key={view}
                    apiBase={apiBase}
                    token={token}
                    abilities={abilities}
                    onChanged={refreshChannelSales}
                    initialPanel={view === 'admin-schools' ? 'schools' : view === 'admin-proposals' || view === 'admin-settings' || view === 'admin-reports' ? 'operations' : 'team'}
                    customerView={() => null}
                  />
                </Suspense>
              )}
              {view === 'leads' && (
                <LeadView
                  leads={filteredLeads}
                  search={search}
                  setSearch={setSearch}
                  onAdvance={can('crm.lead.update') ? advanceLead : undefined}
                />
              )}
              {view === 'students' && (
                <StudentView
                  students={students}
                  search={search}
                  setSearch={setSearch}
                />
              )}
              {view === 'classes' && <ClassView classes={classes} />}
              {view === 'finance' && (
                <FinanceView
                  invoices={invoices}
                  onRecordPayment={
                    can('payment.create') ? setPaymentInvoice : undefined
                  }
                />
              )}
            </>
          )}
        </div>
      </div>

      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-white/10 bg-[#152238]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl lg:hidden"
        aria-label="Điều hướng di động"
      >
        {visibleNav.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition-colors ${view === item.id ? 'bg-white/10 text-[#b9afff]' : 'text-slate-400'}`}
          >
            <item.icon className="size-[18px]" />
            <span>{item.shortLabel}</span>
          </button>
        ))}
      </nav>

      {addOpen && (
        <AddLeadDialog
          sources={sources}
          courses={courses}
          onClose={() => setAddOpen(false)}
          onSubmit={addLead}
        />
      )}
      {trialLead && (
        <BookTrialDialog
          lead={trialLead}
          classes={classOptions}
          onClose={() => setTrialLead(null)}
          onSubmit={(input) => bookTrial(trialLead, input)}
        />
      )}
      {conversionLead && (
        <ConvertLeadDialog
          lead={conversionLead}
          classes={classOptions}
          courses={courses}
          onClose={() => setConversionLead(null)}
          onSubmit={(input) => convertLead(conversionLead, input)}
        />
      )}
      {trialOutcomeLead && (
        <CompleteTrialDialog
          lead={trialOutcomeLead}
          onClose={() => setTrialOutcomeLead(null)}
          onSubmit={(input) => completeTrial(trialOutcomeLead, input)}
        />
      )}
      {paymentInvoice && (
        <RecordPaymentDialog
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          onSubmit={(input) => recordPayment(paymentInvoice, input)}
        />
      )}
      {notice && (
        <output className="fixed bottom-24 right-5 z-50 flex max-w-sm items-center gap-3 rounded-2xl bg-[#152238] px-4 py-3 text-sm font-medium text-white shadow-2xl lg:bottom-6">
          <span className="grid size-6 place-items-center rounded-full bg-[#35b79b]">
            <Check className="size-4" />
          </span>
          {notice}
        </output>
      )}
    </main>
  );
}

function SchoolDashboard({ workspace }: { workspace: ChannelSalesWorkspace }) {
  const cards = [
    { title: 'Tổng số khách hàng', value: workspace.metrics.available + workspace.metrics.approaching + workspace.metrics.contracted },
    { title: 'Chưa đăng ký', value: workspace.metrics.available },
    { title: 'Đang tiếp cận', value: workspace.metrics.approaching },
    { title: 'Đã ký hợp đồng', value: workspace.metrics.contracted },
    { title: 'Sắp hết hạn tiếp cận', value: workspace.metrics.expiring_soon },
  ];
  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="rounded-2xl">
            <CardHeader><CardTitle className="text-sm text-muted-foreground">{card.title}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{card.value.toLocaleString('vi-VN')}</p></CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl">
        <CardHeader><CardTitle>Khách hàng CHECKEE</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Báo cáo phản ánh dữ liệu khách hàng được phép xem. Quản lý danh bạ trường chính và phân hiệu tại mục Quản lý trường học.</p></CardContent>
      </Card>
    </section>
  );
}

function Dashboard({
  metrics,
  pipeline,
  tasks,
  leads,
  onToggleTask,
  onOpenLeads,
}: {
  metrics: Record<string, number>;
  pipeline: { code: string; name: string; total: number; color: string }[];
  tasks: Task[];
  leads: Lead[];
  onToggleTask: (id: number) => void;
  onOpenLeads: () => void;
}) {
  const cards = [
    {
      label: 'Lead mới',
      value: String(metrics.new_leads).padStart(2, '0'),
      delta: '+18%',
      caption: 'so với tuần trước',
      icon: UsersRound,
      color: 'bg-[#e9e6ff] text-[#6558d3]',
    },
    {
      label: 'Cần follow-up',
      value: String(metrics.follow_ups_due).padStart(2, '0'),
      delta: '3 quá hạn',
      caption: 'ưu tiên hôm nay',
      icon: Clock3,
      color: 'bg-[#fff0df] text-[#d87223]',
    },
    {
      label: 'Lịch học thử',
      value: String(metrics.trials_today).padStart(2, '0'),
      delta: '2 lúc 17:30',
      caption: 'trong ngày hôm nay',
      icon: CalendarDays,
      color: 'bg-[#dff7ef] text-[#14856e]',
    },
    {
      label: 'Doanh thu tháng',
      value: compactMoney(metrics.revenue_month),
      delta: '+12.4%',
      caption: `còn ${compactMoney(metrics.outstanding)}`,
      icon: CircleDollarSign,
      color: 'bg-[#e5f1ff] text-[#2c6ecb]',
    },
  ];
  const max = Math.max(...pipeline.map((stage) => Number(stage.total)), 1);
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((metric) => (
          <Card
            key={metric.label}
            className="border-0 bg-card shadow-[0_1px_1px_rgba(31,41,55,.02),0_10px_30px_rgba(31,41,55,.05)] ring-1 ring-border/80 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <CardContent className="flex items-start justify-between p-1">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-3 text-[32px] font-bold tracking-[-0.05em]">
                  {metric.value}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs">
                  <span className="font-semibold text-[#21806d]">
                    {metric.delta}
                  </span>
                  <span className="text-muted-foreground">
                    {metric.caption}
                  </span>
                </div>
              </div>
              <div
                className={`grid size-11 place-items-center rounded-2xl ${metric.color}`}
              >
                <metric.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
        <Card className="border-0 shadow-[0_12px_36px_rgba(31,41,55,.055)] ring-1 ring-border/80">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">
                Hiệu suất pipeline
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Tỷ lệ chuyển đổi 30 ngày gần nhất
              </p>
            </div>
            <Button onClick={onOpenLeads} variant="ghost" size="sm">
              Chi tiết <ArrowUpRight />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {pipeline.slice(0, 5).map((stage) => (
              <div
                key={stage.code}
                className="grid grid-cols-[110px_minmax(0,1fr)_34px] items-center gap-3"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  {stage.name}
                </span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${(Number(stage.total) / max) * 100}%`,
                      background: stage.color,
                    }}
                  />
                </div>
                <span className="text-right text-sm font-bold tabular-nums">
                  {stage.total}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-0 bg-[#152238] text-white shadow-[0_20px_45px_rgba(21,34,56,.15)] ring-0">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a99df8]">
                Việc cần làm
              </p>
              <CardTitle className="mt-2 text-xl font-bold text-white">
                Ưu tiên hôm nay
              </CardTitle>
            </div>
            <Badge className="bg-white/10 text-white hover:bg-white/10">
              {tasks.filter((task) => !task.done).length} việc
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.slice(0, 4).map((task) => (
              <button
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={`group flex w-full items-center gap-3 rounded-xl border border-white/8 p-3 text-left transition-colors ${task.done ? 'bg-white/3 opacity-55' : 'bg-white/6 hover:bg-white/10'}`}
              >
                {task.done ? (
                  <Check className="size-4 text-[#63d4b9]" />
                ) : (
                  <Circle
                    className={`size-4 ${task.priority === 'HIGH' ? 'text-[#ff8a80]' : 'text-[#63d4b9]'}`}
                  />
                )}
                <span
                  className={`min-w-0 flex-1 truncate text-sm font-medium ${task.done ? 'line-through' : ''}`}
                >
                  {task.title}
                </span>
                <span className="text-xs text-slate-400">
                  {task.due_at.includes('T')
                    ? new Date(task.due_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : task.due_at}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="border-0 shadow-sm ring-1 ring-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="size-5 text-[#6558d3]" /> Doanh thu 5 tháng
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              initialDimension={{ width: 600, height: 240 }}
            >
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6558d3" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#6558d3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [`${String(value)} triệu`, 'Doanh thu']}
                  contentStyle={{
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6558d3"
                  strokeWidth={3}
                  fill="url(#revenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm ring-1 ring-border/80">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Lead mới nhất</CardTitle>
            <Button onClick={onOpenLeads} variant="ghost" size="sm">
              Xem tất cả <ChevronRight />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {leads.slice(0, 4).map((lead) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/70"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e9e6ff] text-xs font-bold text-[#6558d3]">
                  {initials(lead.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {lead.full_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {lead.source_name} · {lead.course_name}
                  </p>
                </div>
                <StatusBadge lead={lead} />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function LeadView({
  leads,
  search,
  setSearch,
  onAdvance,
}: {
  leads: Lead[];
  search: string;
  setSearch: (value: string) => void;
  onAdvance?: (lead: Lead) => void;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/80">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Tìm lead"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên, SĐT hoặc mã lead…"
            className="w-full rounded-xl pl-9 sm:w-80"
          />
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="rounded-lg px-3 py-1.5">
            {leads.length} cơ hội
          </Badge>
          <Badge className="rounded-lg bg-[#dff7ef] px-3 py-1.5 text-[#14856e] hover:bg-[#dff7ef]">
            24% chuyển đổi
          </Badge>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Khách hàng</th>
              <th className="px-4 py-3 font-semibold">Quan tâm</th>
              <th className="px-4 py-3 font-semibold">Nguồn</th>
              <th className="px-4 py-3 font-semibold">Trạng thái</th>
              <th className="px-4 py-3 font-semibold">Phụ trách</th>
              <th className="px-4 py-3 font-semibold">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="group transition-colors hover:bg-muted/40"
              >
                <td aria-label={lead.full_name} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-[#e9e6ff] text-xs font-bold text-[#6558d3]">
                      {initials(lead.full_name)}
                    </div>
                    <div>
                      <p className="font-semibold">{lead.full_name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="size-3" />
                        {lead.phone} · {lead.code}
                      </p>
                    </div>
                  </div>
                </td>
                <td
                  aria-label={lead.course_name ?? 'Chưa xác định'}
                  className="px-4 py-4 font-medium"
                >
                  {lead.course_name ?? 'Chưa xác định'}
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {lead.source_name}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge lead={lead} />
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {lead.assigned_user_name ?? 'Chưa giao'}
                </td>
                <td className="px-4 py-4">
                  {onAdvance ? (
                    <Button
                      onClick={() => onAdvance(lead)}
                      variant="ghost"
                      size="sm"
                      className="rounded-lg"
                    >
                      {lead.status_code === 'QUALIFIED'
                        ? 'Đặt học thử'
                        : lead.status_code === 'TRIAL_BOOKED'
                          ? 'Kết quả học thử'
                          : lead.status_code === 'CONSIDERING'
                            ? 'Nhập học'
                            : 'Cập nhật'}{' '}
                      <ChevronRight />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!leads.length && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Không tìm thấy lead phù hợp.
        </div>
      )}
    </Card>
  );
}

function StudentView({
  students,
  search,
  setSearch,
}: {
  students: Student[];
  search: string;
  setSearch: (value: string) => void;
}) {
  const rows = students.filter((student) =>
    [student.full_name, student.code, student.parent_name].some((value) =>
      value?.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <MiniStat
          label="Học viên đang học"
          value={students.length || 48}
          caption="+6 trong tháng"
          icon={GraduationCap}
        />
        <MiniStat
          label="Tỷ lệ tái đăng ký"
          value="82%"
          caption="Tăng 4.2%"
          icon={TrendingUp}
        />
        <MiniStat
          label="Sắp sinh nhật"
          value="07"
          caption="Trong 30 ngày tới"
          icon={CalendarDays}
        />
      </section>
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/80">
        <div className="border-b p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Tìm học viên"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-xl pl-9"
              placeholder="Tìm học viên hoặc phụ huynh…"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Học viên</th>
                <th className="px-4 py-3">Phụ huynh</th>
                <th className="px-4 py-3">Lớp hiện tại</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((student) => (
                <tr key={student.id} className="hover:bg-muted/40">
                  <td aria-label={student.full_name} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-[#e5f1ff] text-xs font-bold text-[#2c6ecb]">
                        {initials(student.full_name)}
                      </div>
                      <div>
                        <p className="font-semibold">{student.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.code} · {student.school_grade}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium">{student.parent_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {student.parent_phone}
                    </p>
                  </td>
                  <td
                    aria-label={student.class_name || 'Chưa xếp lớp'}
                    className="px-4 py-4"
                  >
                    {student.class_name || 'Chưa xếp lớp'}
                  </td>
                  <td className="px-4 py-4">
                    <Badge className="bg-[#dff7ef] text-[#14856e] hover:bg-[#dff7ef]">
                      Đang học
                    </Badge>
                  </td>
                  <td className="px-4">
                    <Button
                      aria-label={`Mở thao tác cho ${student.full_name}`}
                      variant="ghost"
                      size="icon"
                    >
                      <MoreHorizontal />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ClassView({ classes }: { classes: ClassRoom[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {classes.map((item, index) => {
        const ratio = Math.min(
          100,
          (Number(item.enrolled_count) / item.capacity) * 100,
        );
        return (
          <Card
            key={item.id}
            className="group overflow-hidden border-0 shadow-sm ring-1 ring-border/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div
              className={`h-1.5 ${index % 3 === 0 ? 'bg-[#6558d3]' : index % 3 === 1 ? 'bg-[#35b79b]' : 'bg-[#f0a35b]'}`}
            />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-3">
                    {item.code}
                  </Badge>
                  <CardTitle className="text-xl">{item.name}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.course_name}
                  </p>
                </div>
                <div className="grid size-11 place-items-center rounded-2xl bg-muted">
                  <BookOpenCheck className="size-5 text-[#6558d3]" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Info
                  label="Giáo viên"
                  value={item.teacher_name || 'Đang phân công'}
                />
                <Info
                  label="Lịch học"
                  value={item.schedule ?? 'Theo lịch trung tâm'}
                />
              </div>
              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-muted-foreground">Sĩ số</span>
                  <span className="font-semibold">
                    {item.enrolled_count}/{item.capacity} học viên
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[#6558d3] transition-all duration-700"
                    style={{ width: `${ratio}%` }}
                  />
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-xl">
                Mở danh sách lớp <ChevronRight />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function FinanceView({
  invoices,
  onRecordPayment,
}: {
  invoices: Invoice[];
  onRecordPayment?: (invoice: Invoice) => void;
}) {
  const total = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.final_amount),
    0,
  );
  const paid = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.paid_amount),
    0,
  );
  const remaining = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.remaining_amount),
    0,
  );
  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-3">
        <MiniStat
          label="Tổng phải thu"
          value={compactMoney(total)}
          caption={`${invoices.length} hóa đơn`}
          icon={WalletCards}
        />
        <MiniStat
          label="Đã thu"
          value={compactMoney(paid)}
          caption={`${Math.round((paid / total) * 100)}% kế hoạch`}
          icon={CircleDollarSign}
        />
        <MiniStat
          label="Công nợ"
          value={compactMoney(remaining)}
          caption="2 hóa đơn một phần"
          icon={Clock3}
        />
      </section>
      <Card className="overflow-hidden border-0 shadow-sm ring-1 ring-border/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Hóa đơn</th>
                <th className="px-4 py-3">Người thanh toán</th>
                <th className="px-4 py-3 text-right">Phải thu</th>
                <th className="px-4 py-3 text-right">Đã thu</th>
                <th className="px-4 py-3 text-right">Còn lại</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-muted/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{invoice.invoice_code}</p>
                    <p className="text-xs text-muted-foreground">
                      Học viên: {invoice.student_name}
                    </p>
                  </td>
                  <td className="px-4 py-4">{invoice.parent_name}</td>
                  <td className="px-4 py-4 text-right font-medium tabular-nums">
                    {money(invoice.final_amount)}
                  </td>
                  <td className="px-4 py-4 text-right text-[#14856e] tabular-nums">
                    {money(invoice.paid_amount)}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-[#d87223] tabular-nums">
                    {money(invoice.remaining_amount)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      className={
                        invoice.status === 'PAID'
                          ? 'bg-[#dff7ef] text-[#14856e] hover:bg-[#dff7ef]'
                          : 'bg-[#fff0df] text-[#d87223] hover:bg-[#fff0df]'
                      }
                    >
                      {invoice.status === 'PAID'
                        ? 'Đã thanh toán'
                        : invoice.status === 'UNPAID'
                          ? 'Chưa thanh toán'
                          : invoice.status === 'OVERDUE'
                            ? 'Quá hạn'
                            : 'Thanh toán một phần'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {onRecordPayment && Number(invoice.remaining_amount) > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => onRecordPayment(invoice)}
                      >
                        Thu tiền
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function BookTrialDialog({
  lead,
  classes,
  onClose,
  onSubmit,
}: {
  lead: Lead;
  classes: Catalog[];
  onClose: () => void;
  onSubmit: (input: TrialInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const availableClasses = classes.filter(
    (item) => !lead.course_id || item.course_id === lead.course_id,
  );
  const defaultSchedule = new Date(Date.now() + 24 * 60 * 60 * 1000);
  defaultSchedule.setHours(9, 0, 0, 0);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = new FormData(event.currentTarget);
    const classId = Number(data.get('class_id'));
    const classRoom = classes.find((item) => item.id === classId);
    try {
      await onSubmit({
        course_id: Number(lead.course_id ?? classRoom?.course_id),
        class_id: classId,
        scheduled_at: new Date(formText(data, 'scheduled_at')).toISOString(),
        note: formText(data, 'note'),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể đặt lịch.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      eyebrow="Trial booking"
      title="Đặt lịch học thử"
      description={`${lead.full_name} · ${lead.course_name ?? 'Khóa học quan tâm'}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Lớp học thử *">
          <select
            name="class_id"
            required
            className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {availableClasses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.course_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Thời gian *">
          <Input
            name="scheduled_at"
            type="datetime-local"
            required
            min={toLocalInputValue(new Date())}
            defaultValue={toLocalInputValue(defaultSchedule)}
            className="rounded-xl"
          />
        </Field>
        <Field label="Ghi chú chuẩn bị">
          <textarea
            name="note"
            rows={3}
            className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Tài liệu, trình độ dự kiến, yêu cầu của phụ huynh…"
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogActions
          saving={saving}
          onClose={onClose}
          submitText="Đặt lịch"
        />
      </form>
    </DialogShell>
  );
}

function CompleteTrialDialog({
  lead,
  onClose,
  onSubmit,
}: {
  lead: Lead;
  onClose: () => void;
  onSubmit: (input: TrialOutcomeInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await onSubmit({
        result: formText(data, 'result') as TrialOutcomeInput['result'],
        note: formText(data, 'note'),
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Không thể ghi nhận kết quả học thử.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      eyebrow="Trial outcome"
      title="Kết quả học thử"
      description={`${lead.full_name} · ${lead.course_name ?? 'Khóa học quan tâm'}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Đánh giá sau buổi học *">
          <select
            name="result"
            required
            className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="INTERESTED">Phù hợp và quan tâm</option>
            <option value="NEEDS_CONSIDERATION">Cần cân nhắc thêm</option>
            <option value="NOT_INTERESTED">Không phù hợp</option>
          </select>
        </Field>
        <Field label="Nhận xét">
          <textarea
            name="note"
            rows={4}
            className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Mức độ tham gia, phản hồi của học viên và phụ huynh…"
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogActions
          saving={saving}
          onClose={onClose}
          submitText="Lưu kết quả"
        />
      </form>
    </DialogShell>
  );
}

function ConvertLeadDialog({
  lead,
  classes,
  courses,
  onClose,
  onSubmit,
}: {
  lead: Lead;
  classes: Catalog[];
  courses: Catalog[];
  onClose: () => void;
  onSubmit: (input: ConversionInput) => Promise<void>;
}) {
  const availableClasses = classes.filter(
    (item) => !lead.course_id || item.course_id === lead.course_id,
  );
  const [classId, setClassId] = useState(availableClasses[0]?.id ?? 0);
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey] = useState(() =>
    makeIdempotencyKey('convert', lead.id),
  );
  const classRoom = classes.find((item) => item.id === classId);
  const course = courses.find((item) => item.id === classRoom?.course_id);
  const tuitionFee = Number(course?.tuition_fee ?? 0);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await onSubmit({
        idempotency_key: idempotencyKey,
        parent: {
          full_name: formText(data, 'parent_name'),
          phone: formText(data, 'parent_phone'),
          email: formText(data, 'parent_email') || undefined,
        },
        student: {
          full_name: formText(data, 'student_name'),
          date_of_birth: formText(data, 'date_of_birth') || undefined,
          gender:
            (formText(
              data,
              'gender',
            ) as ConversionInput['student']['gender']) || undefined,
          school_name: formText(data, 'school_name') || undefined,
          school_grade: formText(data, 'school_grade') || undefined,
        },
        relationship: formText(
          data,
          'relationship',
        ) as ConversionInput['relationship'],
        class_id: Number(data.get('class_id')),
        discount_amount: Number(data.get('discount_amount') ?? 0),
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Không thể hoàn tất nhập học.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      eyebrow="Lead conversion"
      title="Hoàn tất nhập học"
      description="Tạo mới hồ sơ phụ huynh, học viên, ghi danh và hóa đơn trong một giao dịch."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ tên phụ huynh *">
            <Input
              name="parent_name"
              required
              defaultValue={lead.full_name}
              className="rounded-xl"
            />
          </Field>
          <Field label="Số điện thoại *">
            <Input
              name="parent_phone"
              required
              minLength={9}
              defaultValue={lead.phone}
              className="rounded-xl"
            />
          </Field>
          <Field label="Email phụ huynh">
            <Input name="parent_email" type="email" className="rounded-xl" />
          </Field>
          <Field label="Quan hệ với học viên *">
            <select
              name="relationship"
              className="h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="MOTHER">Mẹ</option>
              <option value="FATHER">Bố</option>
              <option value="GUARDIAN">Người giám hộ</option>
              <option value="OTHER">Khác</option>
            </select>
          </Field>
        </div>
        <div className="border-t pt-5">
          <p className="mb-4 text-sm font-semibold">Thông tin học viên</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ tên học viên *">
              <Input name="student_name" required className="rounded-xl" />
            </Field>
            <Field label="Ngày sinh">
              <Input name="date_of_birth" type="date" className="rounded-xl" />
            </Field>
            <Field label="Giới tính">
              <select
                name="gender"
                className="h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Chưa cập nhật</option>
                <option value="FEMALE">Nữ</option>
                <option value="MALE">Nam</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field label="Khối/lớp tại trường">
              <Input
                name="school_grade"
                placeholder="Ví dụ: Lớp 2"
                className="rounded-xl"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Trường học">
                <Input name="school_name" className="rounded-xl" />
              </Field>
            </div>
          </div>
        </div>
        <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
          <Field label="Lớp ghi danh *">
            <select
              name="class_id"
              required
              value={classId}
              onChange={(event) => setClassId(Number(event.target.value))}
              className="h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {availableClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Giảm học phí">
            <Input
              name="discount_amount"
              type="number"
              min={0}
              max={tuitionFee}
              step={1000}
              value={discount}
              onChange={(event) => setDiscount(Number(event.target.value))}
              className="rounded-xl"
            />
          </Field>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-muted/60 p-4 text-sm">
          <span className="text-muted-foreground">
            Học phí server sẽ xác nhận
          </span>
          <span className="text-lg font-bold">
            {money(Math.max(0, tuitionFee - discount))}
          </span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogActions
          saving={saving}
          onClose={onClose}
          submitText="Hoàn tất nhập học"
        />
      </form>
    </DialogShell>
  );
}

function RecordPaymentDialog({
  invoice,
  onClose,
  onSubmit,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSubmit: (input: PaymentInput) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey] = useState(() =>
    makeIdempotencyKey('payment', invoice.id),
  );

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await onSubmit({
        idempotency_key: idempotencyKey,
        amount: Number(data.get('amount')),
        payment_method: formText(
          data,
          'payment_method',
        ) as PaymentInput['payment_method'],
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Không thể ghi nhận thanh toán.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      eyebrow="Payment"
      title="Ghi nhận thanh toán"
      description={`${invoice.invoice_code} · ${invoice.student_name}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-2xl bg-muted/60 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Công nợ còn lại</span>
            <span className="font-bold text-[#d87223]">
              {money(invoice.remaining_amount)}
            </span>
          </div>
        </div>
        <Field label="Số tiền thu *">
          <Input
            name="amount"
            type="number"
            min={1}
            max={Number(invoice.remaining_amount)}
            step={1}
            defaultValue={Number(invoice.remaining_amount)}
            required
            className="rounded-xl"
          />
        </Field>
        <Field label="Phương thức *">
          <select
            name="payment_method"
            className="h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="BANK_TRANSFER">Chuyển khoản</option>
            <option value="CASH">Tiền mặt</option>
            <option value="CARD">Thẻ</option>
            <option value="OTHER">Khác</option>
          </select>
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogActions
          saving={saving}
          onClose={onClose}
          submitText="Xác nhận thu tiền"
        />
      </form>
    </DialogShell>
  );
}

function DialogShell({
  eyebrow,
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-[#0b1324]/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <dialog
        open
        aria-modal="true"
        aria-label={title}
        className={`max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6558d3]">
              {eyebrow}
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-xl"
          >
            <X />
          </Button>
        </div>
        {children}
      </dialog>
    </div>
  );
}

function DialogActions({
  saving,
  onClose,
  submitText,
}: {
  saving: boolean;
  onClose: () => void;
  submitText: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        className="rounded-xl"
      >
        Hủy
      </Button>
      <Button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[#6558d3] hover:bg-[#594cc8]"
      >
        {saving ? 'Đang lưu…' : submitText}
      </Button>
    </div>
  );
}

function AddLeadDialog({
  sources,
  courses,
  onClose,
  onSubmit,
}: {
  sources: Catalog[];
  courses: Catalog[];
  onClose: () => void;
  onSubmit: (input: {
    full_name: string;
    phone: string;
    source_id: number;
    interested_course_id: number;
    note: string;
  }) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await onSubmit({
        full_name: formText(data, 'full_name'),
        phone: formText(data, 'phone'),
        source_id: Number(data.get('source_id')),
        interested_course_id: Number(data.get('interested_course_id')),
        note: formText(data, 'note'),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo lead.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#0b1324]/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5">
      <form
        onSubmit={submit}
        className="w-full animate-in slide-in-from-bottom-6 rounded-t-3xl bg-card p-6 shadow-2xl duration-300 sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6558d3]">
              Quick create
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-tight">
              Thêm lead mới
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Ghi nhận khách hàng tiềm năng vào pipeline.
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            variant="ghost"
            size="icon"
            className="rounded-xl"
          >
            <X />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ tên phụ huynh *">
            <Input
              name="full_name"
              required
              minLength={2}
              className="rounded-xl"
              placeholder="Nguyễn Minh Anh"
            />
          </Field>
          <Field label="Số điện thoại *">
            <Input
              name="phone"
              required
              minLength={9}
              className="rounded-xl"
              placeholder="0901 234 567"
            />
          </Field>
          <Field label="Nguồn lead">
            <select
              name="source_id"
              className="h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {sources.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Khóa học quan tâm">
            <select
              name="interested_course_id"
              className="h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {courses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ghi chú">
              <textarea
                name="note"
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nhu cầu, khung giờ phù hợp…"
              />
            </Field>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#6558d3] hover:bg-[#594cc8]"
          >
            {saving ? 'Đang lưu…' : 'Tạo lead'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function LoginScreen({
  loading,
  onLogin,
}: {
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [error, setError] = useState('');
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      await onLogin(formText(data, 'email'), formText(data, 'password'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại.');
    }
  };
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#101a2b] p-5">
      <div className="absolute -left-32 -top-32 size-96 rounded-full bg-[#6558d3]/30 blur-3xl" />
      <div className="absolute -bottom-40 -right-24 size-[28rem] rounded-full bg-[#35b79b]/20 blur-3xl" />
      <Card className="relative w-full max-w-md border-white/10 bg-white/[.96] p-3 shadow-2xl dark:bg-[#1b2940]">
        <CardHeader>
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#6558d3] text-white">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-bold">Kidsfit CRM</p>
              <p className="text-xs text-muted-foreground">
                Trung tâm giáo dục
              </p>
            </div>
          </div>
          <CardTitle className="text-2xl">Chào mừng trở lại</CardTitle>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để truy cập workspace MySQL.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input
                name="email"
                type="email"
                defaultValue="admin@kidsfit.vn"
                required
                className="h-11 rounded-xl"
              />
            </Field>
            <Field label="Mật khẩu">
              <Input
                name="password"
                type="password"
                defaultValue="Kidsfit@2026"
                required
                className="h-11 rounded-xl"
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-[#6558d3] hover:bg-[#594cc8]"
            >
              {loading ? 'Đang kết nối…' : 'Đăng nhập'}
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Tài khoản demo đã được điền sẵn.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function StatusBadge({ lead }: { lead: Lead }) {
  return (
    <Badge
      variant="outline"
      className="border-0"
      style={{ color: lead.status_color, background: `${lead.status_color}18` }}
    >
      <span
        className="mr-1.5 size-1.5 rounded-full"
        style={{ background: lead.status_color }}
      />
      {lead.status_name}
    </Badge>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
function formText(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}
function toLocalInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function makeIdempotencyKey(prefix: string, entityId: number) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  return `${prefix}-${entityId}-${suffix}`;
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
function MiniStat({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-border/80">
      <CardContent className="flex items-center justify-between p-1">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-[#21806d]">{caption}</p>
        </div>
        <div className="grid size-11 place-items-center rounded-2xl bg-[#e9e6ff] text-[#6558d3]">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
