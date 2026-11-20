'use client';

import { useState } from 'react';
import { Building2, ContactRound, LogOut, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppDrawer } from '@/components/common/drawers/app-drawer';

export type CurrentUserProfile = {
  id: number;
  code: string | null;
  name: string;
  email: string;
  phone: string | null;
  organization_name: string | null;
  membership_type: string | null;
};

const membershipLabels: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  DIRECTOR: 'Ban Giám Đốc',
  BOARD: 'Ban Giám Đốc',
  ACCOUNTANT: 'Kế toán',
  SALES_MANAGER: 'Quản lý bán hàng',
  PARTNER_ADMIN: 'Quản lý bán hàng',
  CUSTOMER_SERVICE: 'Chăm sóc khách hàng',
  CHECKEE: 'CHECKEE',
  SALES: 'Nhân viên bán hàng',
  COLLABORATOR: 'Cộng tác viên',
  PARTNER_COLLABORATOR: 'Cộng tác viên',
};

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return <div className="min-w-0 space-y-1">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium text-foreground">{value || 'Chưa cập nhật'}</dd>
  </div>;
}

export function UserProfileMenu({
  user, dark, setDark, onLogout, isAdmin,
}: {
  user: CurrentUserProfile | null;
  dark: boolean;
  setDark: (value: boolean | ((current: boolean) => boolean)) => void;
  onLogout: () => Promise<void>;
  isAdmin: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const name = user?.name || 'Tài khoản CRM';
  const initials = name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  const role = isAdmin ? 'Quản trị viên'
    : membershipLabels[user?.membership_type ?? ''] ?? (user?.membership_type || 'Thành viên CRM');

  return <>
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger render={<button type="button"
        aria-label="Mở menu tài khoản" title="Tài khoản cá nhân" aria-haspopup="dialog"
        className="ml-1 grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-sm font-bold text-[#633b38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />}>
        {initials}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(90vw,320px)] space-y-1 rounded-2xl p-2">
        <div className="min-w-0 border-b border-border px-3 py-3">
          <p className="break-words text-sm font-bold">{name}</p>
          <p className="break-all text-xs text-muted-foreground">{user?.email || 'Chưa có email'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{role}</p>
        </div>
        <button type="button" onClick={() => {setMenuOpen(false);setProfileOpen(true);}}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary">
          <UserRound aria-hidden="true" className="size-4 text-primary"/>Hồ sơ cá nhân
        </button>
        <button type="button" aria-pressed={dark} onClick={() => {setDark(value => !value);setMenuOpen(false);}}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary">
          {dark ? <Sun aria-hidden="true" className="size-4 text-primary"/> : <Moon aria-hidden="true" className="size-4 text-primary"/>}
          {dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        </button>
        <div className="border-t border-border pt-1">
          <button type="button" onClick={() => {setMenuOpen(false);void onLogout();}}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-destructive">
            <LogOut aria-hidden="true" className="size-4"/>Đăng xuất
          </button>
        </div>
      </PopoverContent>
    </Popover>

    <AppDrawer open={profileOpen} onOpenChange={setProfileOpen} title="Hồ sơ cá nhân"
      bodyClassName="space-y-4 bg-muted/10">
      <section className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserRound className="size-7"/>
        </div>
        <div className="min-w-0 space-y-1.5">
          <h2 className="break-words text-lg font-bold leading-tight">{name}</h2>
          <p className="break-all text-xs text-muted-foreground">{user?.email || 'Chưa cập nhật'}</p>
          <span className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">{role}</span>
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <ContactRound aria-hidden="true" className="size-4 text-primary"/>Thông tin cá nhân
        </h3>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <DetailField label="Họ và tên" value={user?.name}/>
          <DetailField label="Số điện thoại" value={user?.phone}/>
          <div className="sm:col-span-2"><DetailField label="Email" value={user?.email}/></div>
          <DetailField label="Mã nhân sự" value={user?.code}/>
        </dl>
      </section>
      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Building2 aria-hidden="true" className="size-4 text-primary"/>Thông tin tổ chức & phân quyền
        </h3>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <DetailField label="Tổ chức" value={user?.organization_name}/>
          <DetailField label="Vai trò" value={role}/>
        </dl>
      </section>
      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck aria-hidden="true" className="size-4 text-primary"/>Thông tin tài khoản
        </h3>
        <p className="text-sm text-muted-foreground">
          Hồ sơ chỉ xem. Việc thay đổi thông tin cá nhân và mật khẩu không thuộc phạm vi tính năng này.
        </p>
      </section>
    </AppDrawer>
  </>;
}
