'use client';
import { ManagerOperationsPage } from '@/components/roles/ManagerOperationsPage';
import { ChannelOperations } from '@/components/crm/channel-operations';
import type { ManagerPageProps } from '@/types/manager-pages';

/** Team management and commission adjustments share the manager's limited staff scope. */
export function TeamPage(props: ManagerPageProps) {
  const canView = props.abilities.includes('*') || props.abilities.includes('channel_sales.commission.view');
  return <div className="space-y-8">
    <ManagerOperationsPage section="team" {...props}/>
    {canView && <section className="space-y-3 border-t pt-6">
      <div>
        <h2 className="text-lg font-semibold">Hoa hồng đội nhóm</h2>
        <p className="text-sm text-muted-foreground">Chỉ Nhân viên/CTV thuộc phạm vi quản lý. Điều chỉnh tăng/giảm áp dụng trực tiếp và phải ghi lý do.</p>
      </div>
      <ChannelOperations apiBase={props.apiBase} token={props.token} abilities={props.abilities}
        onChanged={props.onChanged} initialPanel="finance" allowedPanels={['finance']} hideTabs
        customerView={() => null}/>
    </section>}
  </div>;
}
