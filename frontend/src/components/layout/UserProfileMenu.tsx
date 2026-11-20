'use client';

import { useState } from 'react';
import { Building2, ChevronRight, Camera, ContactRound, LockKeyhole, LogOut, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { appNotice } from '@/components/common/app-toast-provider';
import { createApiClient } from '@/services/api.client';

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
  user, dark, setDark, onLogout, isAdmin, apiBase, token, avatarUrl, onAvatarChanged,
}: {
  user: CurrentUserProfile | null;
  dark: boolean;
  setDark: (value: boolean | ((current: boolean) => boolean)) => void;
  onLogout: () => Promise<void>;
  isAdmin: boolean;
  apiBase: string;
  token: string;
  avatarUrl: string | null;
  onAvatarChanged: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const closePassword = () => {
    setPasswordOpen(false); setCurrentPassword(''); setNewPassword('');
    setConfirmPassword(''); setPasswordError('');
  };
  const changePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 12 || newPassword.length > 200) {
      setPasswordError('Mật khẩu mới phải từ 12 đến 200 ký tự.'); return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu không khớp.'); return;
    }
    setSavingPassword(true);
    try {
      await createApiClient(apiBase)('/me/change-password', token, {
        method: 'POST', body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      closePassword();
      appNotice.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      await onLogout();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Không thể đổi mật khẩu.');
    } finally { setSavingPassword(false); }
  };
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const uploadAvatar = async (file: File) => {
    setAvatarError('');
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) {
      setAvatarError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'); return;
    }
    if (file.size === 0 || file.size > 2 * 1024 * 1024) {
      setAvatarError('Ảnh phải nhỏ hơn hoặc bằng 2 MB.'); return;
    }
    const data = new FormData();
    data.append('file', file);
    setAvatarBusy(true);
    try {
      const response = await fetch(apiBase + '/me/avatar', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: data,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as {message?:string};
        throw new Error(body.message || 'Không thể cập nhật ảnh đại diện.');
      }
      onAvatarChanged();
      appNotice.success('Ảnh đại diện đã được cập nhật.');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Không thể tải ảnh.');
    } finally { setAvatarBusy(false); }
  };
  const removeAvatar = async () => {
    setAvatarBusy(true); setAvatarError('');
    try {
      const response = await fetch(apiBase + '/me/avatar', {
        method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
      });
      if (!response.ok) throw new Error('Không thể xóa ảnh đại diện.');
      onAvatarChanged();
      appNotice.success('Đã xóa ảnh đại diện.');
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Không thể xóa ảnh.');
    } finally { setAvatarBusy(false); }
  };
  const name = user?.name || 'Tài khoản CRM';
  const initials = name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  const role = isAdmin ? 'Quản trị viên'
    : membershipLabels[user?.membership_type ?? ''] ?? (user?.membership_type || 'Thành viên CRM');

  return <>
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger render={<button type="button"
        aria-label="Mở menu tài khoản" title="Tài khoản cá nhân" aria-haspopup="dialog"
        className="ml-1 grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-sm font-bold text-[#633b38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />}>
        {avatarUrl ? <span aria-hidden="true" className="block size-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url("${avatarUrl}")` }}/> : initials}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,288px)] space-y-1 rounded-2xl p-2">
        <div className="flex min-w-0 items-center gap-3 border-b border-border px-2 py-2.5">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-xs font-bold text-[#633b38]">{avatarUrl ? <span aria-hidden="true" className="block size-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url("${avatarUrl}")` }}/> : initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold" title={name}>{name}</p>
            <p className="truncate text-xs text-muted-foreground" title={user?.email}>{user?.email || 'Chưa có email'}</p>
            <p className="truncate text-xs text-muted-foreground">{role}</p>
          </div>
        </div>
        <button type="button" onClick={() => {setMenuOpen(false);setProfileOpen(true);}}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary">
          <UserRound aria-hidden="true" className="size-4 text-primary"/>Hồ sơ cá nhân<ChevronRight aria-hidden="true" className="ml-auto size-4 text-muted-foreground"/>
        </button>
        <button type="button" onClick={() => {setMenuOpen(false);setPasswordOpen(true);}}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary">
          <LockKeyhole aria-hidden="true" className="size-4 text-primary"/>Đổi mật khẩu
          <ChevronRight aria-hidden="true" className="ml-auto size-4 text-muted-foreground"/>
        </button>
        <button type="button" aria-pressed={dark} onClick={() => {setDark(value => !value);setMenuOpen(false);}}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary">
          {dark ? <Sun aria-hidden="true" className="size-4 text-primary"/> : <Moon aria-hidden="true" className="size-4 text-primary"/>}
          Giao diện tối<span aria-hidden="true" className={`ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${dark ? 'bg-primary' : 'bg-muted-foreground/40'}`}><span className={`size-4 rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-4' : ''}`}/></span>
        </button>
        <div className="border-t border-border pt-1">
          <button type="button" onClick={() => {setMenuOpen(false);void onLogout();}}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-destructive">
            <LogOut aria-hidden="true" className="size-4"/>Đăng xuất
          </button>
        </div>
      </PopoverContent>
    </Popover>

    <AppDrawer open={passwordOpen} onOpenChange={open => {if(!open&&!savingPassword)closePassword();}} title="Đổi mật khẩu" busy={savingPassword}
      bodyClassName="space-y-4 bg-muted/10"
      footer={<div className="flex flex-wrap justify-end gap-2">
        <AppButton type="button" tone="neutral" disabled={savingPassword} onClick={closePassword}>Hủy</AppButton>
        <AppButton type="submit" form="account-change-password" busy={savingPassword}>Cập nhật mật khẩu</AppButton>
      </div>}>
      <form id="account-change-password" onSubmit={event => {event.preventDefault();void changePassword();}} className="space-y-4" noValidate>
        <p className="text-sm text-muted-foreground">Nhập mật khẩu hiện tại để bảo vệ tài khoản. Sau khi đổi thành công, bạn cần đăng nhập lại.</p>
        {[
          {id:'current-password',label:'Mật khẩu hiện tại',value:currentPassword,change:setCurrentPassword,auto:'current-password'},
          {id:'new-password',label:'Mật khẩu mới',value:newPassword,change:setNewPassword,auto:'new-password'},
          {id:'confirm-password',label:'Xác nhận mật khẩu mới',value:confirmPassword,change:setConfirmPassword,auto:'new-password'},
        ].map(field => <div key={field.id} className="flex flex-col gap-2">
          <label htmlFor={field.id} className="text-sm font-medium">{field.label}</label>
          <Input id={field.id} type="password" required minLength={field.id==='current-password'?1:12}
            maxLength={200} autoComplete={field.auto} className="h-10"
            disabled={savingPassword} value={field.value} onChange={event=>field.change(event.target.value)}/>
        </div>)}
        {passwordError&&<p role="alert" className="text-sm text-destructive">{passwordError}</p>}
      </form>
    </AppDrawer>
    <AppDrawer open={profileOpen} onOpenChange={setProfileOpen} title="Hồ sơ cá nhân"
      bodyClassName="space-y-4 bg-muted/10">
      <section className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {avatarUrl ? <span aria-hidden="true" className="block size-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url("${avatarUrl}")` }}/> : <UserRound className="size-7"/>}
        </div>
        <div className="min-w-0 space-y-1.5">
          <h2 className="break-words text-lg font-bold leading-tight">{name}</h2>
          <p className="break-all text-xs text-muted-foreground">{user?.email || 'Chưa cập nhật'}</p>
          <span className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium">{role}</span>
        </div>
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Camera aria-hidden="true" className="size-4 text-primary"/>Ảnh đại diện
        </h3>
        <p className="text-xs text-muted-foreground">Ảnh JPEG, PNG hoặc WebP; tối đa 2 MB. Ảnh chỉ xem được khi đăng nhập.</p>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="profile-avatar-upload" aria-disabled={avatarBusy}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent">
            {avatarBusy ? 'Đang xử lý...' : 'Tải ảnh lên'}
          </label>
          <input id="profile-avatar-upload" className="sr-only" type="file"
            accept="image/jpeg,image/png,image/webp" disabled={avatarBusy}
            onChange={event => {
              const file = event.currentTarget.files?.[0];
              if (file) void uploadAvatar(file);
              event.currentTarget.value = '';
            }}/>
          {avatarUrl&&<button type="button" disabled={avatarBusy} onClick={() => void removeAvatar()}
            className="min-h-10 rounded-lg px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">
            Xóa ảnh
          </button>}
        </div>
        {avatarError&&<p role="alert" className="text-sm text-destructive">{avatarError}</p>}
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
