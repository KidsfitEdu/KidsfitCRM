'use client';

import { Building2, ContactRound, ShieldCheck, UserRound } from 'lucide-react';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AdminStatusBadge } from '@/components/common/admin-list-ui';
import type { ChannelManagement } from '@/lib/channel-operations';

type Person = ChannelManagement['team'][number];
type Organization = ChannelManagement['organizations'][number];

type Props = {
  person: Person | null;
  onClose: () => void;
  team: Person[];
  organizations: Organization[];
  roleName: (role: string) => string;
};

const statusName = (status: string) =>
  status === 'ACTIVE' ? 'Hoạt động' : status === 'SUSPENDED' ? 'Tạm khóa' : status;

function DetailField({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 space-y-1">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium text-foreground">{value || 'Chưa cập nhật'}</dd>
  </div>;
}

function SectionHeading({ icon: Icon, children }: {
  icon: typeof UserRound;
  children: React.ReactNode;
}) {
  return <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
    <Icon aria-hidden="true" className="size-4 text-[#1b5e20] dark:text-[#81c784]"/>
    {children}
  </h3>;
}

export function PersonnelDetailDrawer({ person, onClose, team, organizations, roleName }: Props) {
  const organization = organizations.find(o => o.id === person?.organization_id);
  const organizationSuspended = organization?.status === 'SUSPENDED';
  const accountStatus = person?.account_status ?? 'ACTIVE';
  const membershipStatus = person?.status ?? 'ACTIVE';
  const accountSuspended = accountStatus !== 'ACTIVE';
  const memberSuspended = membershipStatus !== 'ACTIVE';
  const effectiveLabel = accountSuspended ? 'Tài khoản bị khóa'
    : memberSuspended ? 'Thành viên bị khóa'
      : organizationSuspended ? 'Tổ chức bị khóa' : 'Hoạt động';
  const effectiveCode = effectiveLabel === 'Hoạt động' ? 'ACTIVE' : 'SUSPENDED';
  const hasManager = person != null &&
    ['SALES', 'COLLABORATOR', 'PARTNER_COLLABORATOR'].includes(person.membership_type);
  const manager = hasManager
    ? team.find(p => p.user_id === person.manager_user_id && p.organization_id === person.organization_id)
    : undefined;

  return <AppDrawer open={person !== null} onOpenChange={open => { if (!open) onClose(); }}
    title="Thông tin nhân sự" bodyClassName="space-y-4 bg-muted/10">
    {person && <>
      <section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#e7f4e8] text-[#1b5e20] dark:bg-[#1b5e20]/20 dark:text-[#81c784]">
          <UserRound className="size-7"/>
        </div>
        <div className="min-w-0 space-y-1.5">
          <h2 className="break-words text-lg font-bold leading-tight">{person.name}</h2>
          <p className="break-all text-xs text-muted-foreground">{person.email}</p>
          <div className="flex flex-wrap gap-2">
            <AdminStatusBadge status={effectiveCode} label={effectiveLabel}/>
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">
              {roleName(person.membership_type)}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <SectionHeading icon={ContactRound}>Thông tin cá nhân</SectionHeading>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <DetailField label="Họ và tên" value={person.name}/>
          <DetailField label="Số điện thoại" value={person.phone ?? ''}/>
          <div className="sm:col-span-2">
            <DetailField label="Email" value={person.email}/>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <SectionHeading icon={Building2}>Thông tin tổ chức & phân quyền</SectionHeading>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <DetailField label="Tổ chức" value={person.organization_name}/>
          <DetailField label="Vai trò" value={roleName(person.membership_type)}/>
          {hasManager && <div className="sm:col-span-2">
            <DetailField label="Quản lý trực tiếp" value={manager?.name ?? ''}/>
          </div>}
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <SectionHeading icon={ShieldCheck}>Trạng thái truy cập</SectionHeading>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt>Tài khoản</dt>
            <dd><AdminStatusBadge status={accountStatus} label={statusName(accountStatus)}/></dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Thành viên tổ chức</dt>
            <dd><AdminStatusBadge status={membershipStatus} label={statusName(membershipStatus)}/></dd>
          </div>
          {organizationSuspended && <div className="flex items-center justify-between gap-3">
            <dt>Tổ chức</dt>
            <dd><AdminStatusBadge status="SUSPENDED" label="Tạm khóa"/></dd>
          </div>}
        </dl>
      </section>
    </>}
  </AppDrawer>;
}
