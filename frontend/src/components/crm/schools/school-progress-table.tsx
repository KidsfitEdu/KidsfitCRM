'use client';

import { ListChecks } from 'lucide-react';
import {
  AdminIconAction, AdminStatusBadge, adminTableCellClass
} from '@/components/common/admin-list-ui';
import { workflowDate } from '@/lib/school-operations';

export type ProgressSchool = {
  id:number; code:string; display_name:string; owner_user_id:number;
  owner_user_name:string|null; organization_id?:number; organization_name?:string|null;
  visible_status:string; next_follow_up_at:string|null; protected_until:string|null;
  contract_code:string|null;
};
const nice=(date:string|null)=>date?workflowDate(date):'—';

export function ProgressTableHeading({board=false}:{board?:boolean}) {
  return <tr>
    <th className="px-5 py-4">Trường học</th>
    {board&&<th className="px-5 py-4">Tổ chức</th>}
    <th className="px-5 py-4">Sales phụ trách</th>
    <th className="px-5 py-4">Trạng thái</th>
    <th className="px-5 py-4">Lịch hẹn tiếp</th>
    <th className="px-5 py-4">Hạn bảo vệ</th>
    <th className="px-5 py-4">Hợp đồng</th>
    <th className="px-5 py-4 text-center">Chi tiết</th>
  </tr>;
}

export function ProgressTableRows({rows,board=false,onJournal}:{
  rows:ProgressSchool[];board?:boolean;onJournal:(row:ProgressSchool)=>void;
}) {
  return <>{rows.map(row=><tr key={row.id}
    className="border-t border-border/70 even:bg-muted/20 hover:bg-accent">
    <td className={adminTableCellClass}>
      <p className="font-semibold">{row.display_name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{row.code}</p>
    </td>
    {board&&<td className={adminTableCellClass}>{row.organization_name??'—'}</td>}
    <td className={adminTableCellClass}>{row.owner_user_name??'Chưa phân công'}</td>
    <td className={adminTableCellClass}><AdminStatusBadge status={row.visible_status}
      label={row.visible_status==='CONTRACTED'?'Đã ký hợp đồng':'Đang tiếp cận'}/></td>
    <td className={adminTableCellClass}>{nice(row.next_follow_up_at)}</td>
    <td className={adminTableCellClass}>{nice(row.protected_until)}</td>
    <td className={adminTableCellClass}><span className="break-all">{row.contract_code??'—'}</span></td>
    <td className={adminTableCellClass}>
      <div className="flex justify-center"><AdminIconAction icon={ListChecks}
        label={'Xem nhật ký '+row.display_name} onClick={()=>onJournal(row)}/></div>
    </td>
  </tr>)}</>;
}
