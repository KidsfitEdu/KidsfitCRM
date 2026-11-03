'use client';

import { useState } from 'react';
import { AlertTriangle, Building2, FileCheck2, WalletCards, Clock3, Handshake, RefreshCw } from 'lucide-react';
import { AppPageHeader } from '@/components/common/app-page-header';
import { AppStatCard } from '@/components/common/app-stat-card';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { useBoardData, currentBusinessPeriod, boardMoney, boardNumber } from './board-data';
import type { RolePageProps } from '@/types/role-pages';

export function BoardReportsPage({apiBase,token,abilities}:RolePageProps) {
  const [period,setPeriod] = useState(currentBusinessPeriod);
  const allowed = abilities.includes('*')||abilities.includes('channel_sales.school.escalation.resolve')||abilities.includes('channel_sales.school.dispute.resolve');
  const {report,connected} = useBoardData(allowed?apiBase:'',token,period);
  const data=report.data;
  const metrics=[
    {label:'Trường khả dụng (tại thời điểm báo cáo)',value:boardNumber(data?.available_schools),icon:Building2},
    {label:'Hợp đồng hiệu lực',value:boardNumber(data?.active_contracts),icon:FileCheck2},
    {label:'Lượt tiếp cận hết hạn trong kỳ',value:boardNumber(data?.expired_approaches),icon:Handshake},
    {label:'Đề xuất quá hạn',value:boardNumber(data?.overdue_proposals),icon:AlertTriangle},
    {label:'Gia hạn quá hạn',value:boardNumber(data?.overdue_extensions),icon:Clock3},
    {label:'Doanh thu thu ròng trong kỳ',value:boardMoney(data?.net_collected_revenue),icon:WalletCards},
  ];
  return <div className="space-y-5">
    <AppPageHeader eyebrow="BAN GIÁM ĐỐC / KIDSFIT CRM" title="Báo cáo điều hành"
      description="Theo dõi kết quả vận hành và doanh thu trên phạm vi báo cáo mà tài khoản được phép xem."
      actions={<div className="flex items-center gap-2">
        <label htmlFor="board-report-period" className="text-sm">Kỳ báo cáo</label>
        <Input id="board-report-period" type="month" className="w-44" value={period} onChange={e=>setPeriod(e.target.value)}/>
        <AppButton tone="outline" size="sm" disabled={!connected||report.isFetching} onClick={()=>void report.refetch()}
          leadingIcon={<RefreshCw className="size-4"/>}>Làm mới</AppButton>
      </div>}/>
    {!connected && <p className="rounded-xl border p-4 text-sm text-muted-foreground">Chưa kết nối API hoặc chưa được cấp quyền báo cáo.</p>}
    {report.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{report.error instanceof Error?report.error.message:'Không tải được báo cáo.'}</p>}
    {report.isFetching && <p role="status" className="text-sm text-muted-foreground">Đang tải báo cáo…</p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(m=><AppStatCard key={m.label} {...m}/>)}</div>
    <section className="rounded-2xl border bg-card p-5">
      <h3 className="font-semibold">Đối soát doanh thu theo kỳ</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Tổng thực thu</p><p className="mt-2 text-lg font-bold">{boardMoney(data?.collected_revenue)}</p></div>
        <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Khoản hoàn</p><p className="mt-2 text-lg font-bold">{boardMoney(data?.refunded_revenue)}</p></div>
        <div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Thu ròng</p><p className="mt-2 text-lg font-bold">{boardMoney(data?.net_collected_revenue)}</p></div>
      </div>
    </section>
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="p-5"><h3 className="font-semibold">Hiệu quả phân bổ</h3><p className="mt-1 text-sm text-muted-foreground">Theo Quản lý và người nhận trường trong kỳ được chọn.</p></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-[#1b5e20] text-xs uppercase text-white"><tr>{['Quản lý','Sales/CTV','Đã mời','Đã nhận','Từ chối','Đã hủy'].map(x=><th scope="col" className="px-5 py-3" key={x}>{x}</th>)}</tr></thead>
          <tbody>{(data?.allocation_performance??[]).map((r,i)=><tr key={r.assigned_by_user_id+'-'+r.assignee_user_id+'-'+i} className="border-b">
            <td className="px-5 py-3">{r.manager_name}</td><td className="px-5 py-3">{r.assignee_name}</td>
            <td className="px-5 py-3">{r.invited}</td><td className="px-5 py-3">{r.accepted}</td>
            <td className="px-5 py-3">{r.declined}</td><td className="px-5 py-3">{r.cancelled}</td></tr>)}</tbody>
        </table>
        {data && !data.allocation_performance.length && <p className="p-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu phân bổ trong kỳ.</p>}
      </div>
    </section>
    <p className="text-xs text-muted-foreground">Số trường khả dụng, hợp đồng hiệu lực và hồ sơ quá hạn là số tại thời điểm truy vấn; chỉ số thực thu, hoàn và tiếp cận hết hạn được tính trong kỳ báo cáo. Tỷ lệ chuyển đổi sẽ chỉ bổ sung khi thống nhất mẫu số và phạm vi.</p>
  </div>;
}
