'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, Building2, FileCheck2, Handshake, Wallet, RefreshCw } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { useBoardData, currentBusinessPeriod, boardMoney, boardNumber } from './board-data';
import type { RolePageProps } from '@/types/role-pages';

export function BoardDashboardPage({apiBase,token,abilities}:RolePageProps) {
  const [period,setPeriod] = useState(currentBusinessPeriod);
  const permitted = abilities.includes('*') || abilities.includes('channel_sales.school.escalation.resolve')
    || abilities.includes('channel_sales.school.dispute.resolve');
  const {report,operations,connected} = useBoardData(permitted?apiBase:'',token,period);
  const metrics = report.data;
  const openDisputes = operations.data?.disputes.filter(d=>d.status==='OPEN').length;
  const alerts = (metrics?.overdue_proposals ?? 0)+(metrics?.overdue_extensions ?? 0);
  const cards = [
    {label:'Trường còn khả dụng',value:boardNumber(metrics?.available_schools),icon:Building2},
    {label:'Hợp đồng hiệu lực',value:boardNumber(metrics?.active_contracts),icon:FileCheck2},
    {label:'Doanh thu thực thu ròng',value:boardMoney(metrics?.net_collected_revenue),icon:Wallet},
    {label:'Hồ sơ quá hạn',value:boardNumber(metrics?alerts:undefined),icon:AlertTriangle},
    {label:'Lượt tiếp cận hết hạn trong kỳ',value:boardNumber(metrics?.expired_approaches),icon:Handshake},
    {label:'Tranh chấp đang mở (trang hiện tại)',value:boardNumber(openDisputes),icon:Activity},
  ];
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Tổng quan điều hành"
      description="Giám sát hoạt động theo dữ liệu và quyền được cấp, không thay thế bước duyệt nghiệp vụ của các bộ phận."
      actions={<div className="flex flex-wrap items-center gap-2">
        <label htmlFor="board-dashboard-period" className="text-sm font-medium">Kỳ báo cáo</label>
        <Input id="board-dashboard-period" type="month" className="w-44" value={period} onChange={e=>setPeriod(e.target.value)}/>
        <AppButton type="button" tone="outline" disabled={!connected||report.isFetching||operations.isFetching}
          onClick={()=>{void report.refetch();void operations.refetch();}} leadingIcon={<RefreshCw className="size-4"/>}>Làm mới</AppButton>
      </div>}/>
    {!connected && <output className="block rounded-xl border p-4 text-sm text-muted-foreground">
      {!apiBase?'Đang xem giao diện mẫu. Kết nối API để tải dữ liệu thực tế.':'Tài khoản không có quyền xem báo cáo điều hành.'}
    </output>}
    {(report.error||operations.error) && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
      {report.error instanceof Error?report.error.message:operations.error instanceof Error?operations.error.message:'Không tải được dữ liệu.'}
    </p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map(c=><AppStatCard key={c.label} {...c}/>)}
    </div>
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">Cảnh báo cần theo dõi</h3>
      {metrics && <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <p className="rounded-xl border p-4 text-sm">Đề xuất quá hạn: <strong>{boardNumber(metrics.overdue_proposals)}</strong></p>
        <p className="rounded-xl border p-4 text-sm">Gia hạn quá hạn: <strong>{boardNumber(metrics.overdue_extensions)}</strong></p>
      </div>}
      {!metrics && <p className="mt-2 text-sm text-muted-foreground">{report.isPending&&connected?'Đang tải báo cáo…':'Chưa có dữ liệu báo cáo.'}</p>}
      <p className="mt-3 text-xs text-muted-foreground">Số tranh chấp là số hồ sơ đang mở trên trang dữ liệu hiện tại, không phải tổng toàn hệ thống. Các chỉ số theo kỳ phụ thuộc định nghĩa từ API báo cáo.</p>
    </section>
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 font-semibold">Hiệu suất phân bổ theo Quản lý và Sales</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[660px] text-left text-sm">
          <thead className="border-b bg-muted/50"><tr>{['Quản lý','Nhân sự','Đã mời','Đã nhận','Từ chối','Đã hủy'].map(h=><th key={h} scope="col" className="px-3 py-3">{h}</th>)}</tr></thead>
          <tbody>{(metrics?.allocation_performance??[]).map((r,i)=><tr key={r.assigned_by_user_id+'-'+r.assignee_user_id+'-'+i} className="border-b">
            <td className="px-3 py-3">{r.manager_name}</td><td className="px-3 py-3">{r.assignee_name}</td>
            <td className="px-3 py-3">{r.invited}</td><td className="px-3 py-3">{r.accepted}</td>
            <td className="px-3 py-3">{r.declined}</td><td className="px-3 py-3">{r.cancelled}</td>
          </tr>)}</tbody>
        </table>
        {metrics && metrics.allocation_performance.length===0 && <p className="p-5 text-center text-sm text-muted-foreground">Không có hoạt động phân bổ trong kỳ này.</p>}
      </div>
    </section>
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold">Đối soát doanh thu theo kỳ</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Tổng thực thu</p><p className="mt-2 text-lg font-bold">{boardMoney(metrics?.collected_revenue)}</p></div>
        <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Khoản hoàn</p><p className="mt-2 text-lg font-bold">{boardMoney(metrics?.refunded_revenue)}</p></div>
        <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Thu ròng</p><p className="mt-2 text-lg font-bold">{boardMoney(metrics?.net_collected_revenue)}</p></div>
      </div>
    </section>
  </div>;
}
