'use client';

import { useState } from 'react';
import { Building2, ChevronRight, Camera, ContactRound, LockKeyhole, LogOut, Moon, Pencil, ShieldCheck, Sun, UserRound, Eye, EyeOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AppDrawer } from '@/components/common/drawers/app-drawer';
import { ConfirmDialog } from '@/components/common/dialogs/confirm-dialog';
import { AppButton } from '@/components/common/buttons/app-button';
import { Input } from '@/components/ui/input';
import { appNotice } from '@/components/common/app-toast-provider';
import { ApiRequestError, createApiClient } from '@/services/api.client';

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
  user, dark, setDark, onLogout, isAdmin, apiBase, token, avatarUrl, onAvatarChanged, onProfileUpdated,
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
  onProfileUpdated: (profile: CurrentUserProfile) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [closeAfterDiscard, setCloseAfterDiscard] = useState(false);
  const profileDirty = editingProfile && (
    editName.trim() !== (user?.name ?? '') || editPhone.trim() !== (user?.phone ?? '')
  );
  const startProfileEdit = () => {
    setEditName(user?.name ?? '');
    setEditPhone(user?.phone ?? '');
    setProfileError('');
    setEditingProfile(true);
  };
  const discardProfileEdit = () => {
    setEditingProfile(false);
    setProfileError('');
    setDiscardPrompt(false);
    if (closeAfterDiscard) setProfileOpen(false);
    setCloseAfterDiscard(false);
  };
  const requestProfileCancel = (closeDrawer: boolean) => {
    if (profileSaving) return;
    if (profileDirty) {
      setCloseAfterDiscard(closeDrawer);
      setDiscardPrompt(true);
      return;
    }
    setEditingProfile(false);
    setProfileError('');
    if (closeDrawer) setProfileOpen(false);
  };
  const saveProfile = async () => {
    const name = editName.trim();
    const phone = editPhone.trim();
    setProfileError('');
    if (!name || name.length > 190) {
      setProfileError('Họ và tên phải có từ 1 đến 190 ký tự.'); return;
    }
    if (phone.length > 40 || (phone && !/^\+?[0-9][0-9\s.()-]*$/.test(phone))) {
      setProfileError('Số điện thoại không đúng định dạng hoặc vượt quá 40 ký tự.'); return;
    }
    if (!profileDirty) { setEditingProfile(false); return; }
    setProfileSaving(true);
    try {
      const response = await createApiClient(apiBase)<{user:CurrentUserProfile}>('/me', token, {
        method: 'PATCH', body: JSON.stringify({name,phone:phone || null}),
      });
      onProfileUpdated(response.user);
      setEditingProfile(false);
      appNotice.success('Cập nhật hồ sơ thành công.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ.');
    } finally { setProfileSaving(false); }
  };
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});
  const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});
  const [savingPassword, setSavingPassword] = useState(false);
  const closePassword = () => {
    setPasswordOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordFieldErrors({});
    setPasswordVisibility({});
  };
  const changePassword = async () => {
    if (savingPassword) return;
    setPasswordError('');
    const errors: Record<string, string> = {};
    if (!currentPassword) errors['current-password'] = 'Vui lòng nhập mật khẩu hiện tại.';
    if (newPassword.length < 12 || newPassword.length > 200)
      errors['new-password'] = 'Mật khẩu mới phải từ 12 đến 200 ký tự.';
    else if (newPassword === currentPassword)
      errors['new-password'] = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    if (!confirmPassword) errors['confirm-password'] = 'Vui lòng xác nhận mật khẩu mới.';
    else if (newPassword !== confirmPassword)
      errors['confirm-password'] = 'Xác nhận mật khẩu không khớp.';
    setPasswordFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSavingPassword(true);
    let changed = false;
    try {
      await createApiClient(apiBase)('/me/change-password', token, {
        method: 'POST', body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      changed = true;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 429)
        setPasswordError('Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.');
      else {
        const message = error instanceof Error ? error.message : 'Không thể đổi mật khẩu.';
        if (message.includes('Mật khẩu hiện tại không chính xác'))
          setPasswordFieldErrors({ 'current-password': message });
        else setPasswordError(message);
      }
    } finally {
      setSavingPassword(false);
    }
    if (!changed) return;
    closePassword();
    appNotice.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
    // The password has already changed on the server; logout errors are not password-change errors.
    await onLogout();
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
          <div className="relative">
            <Input id={field.id} type={passwordVisibility[field.id] ? 'text' : 'password'} required
              minLength={field.id==='current-password'?1:12} maxLength={200}
              autoComplete={field.auto} className="h-11 rounded-full pr-12"
              aria-invalid={Boolean(passwordFieldErrors[field.id])}
              aria-describedby={passwordFieldErrors[field.id] ? `${field.id}-error` : undefined}
              disabled={savingPassword} value={field.value}
              onChange={event => {
                field.change(event.target.value);
                setPasswordFieldErrors(errors => ({ ...errors, [field.id]: '' }));
              }}/>
            <button type="button" disabled={savingPassword}
              onClick={() => setPasswordVisibility(visibility => ({
                ...visibility, [field.id]: !visibility[field.id],
              }))}
              aria-label={passwordVisibility[field.id] ? `Ẩn ${field.label.toLowerCase()}` : `Hiện ${field.label.toLowerCase()}`}
              aria-pressed={Boolean(passwordVisibility[field.id])}
              className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary disabled:opacity-50">
              {passwordVisibility[field.id] ? <EyeOff aria-hidden="true" className="size-4"/> : <Eye aria-hidden="true" className="size-4"/>}
            </button>
          </div>
          {passwordFieldErrors[field.id] && <p id={`${field.id}-error`} role="alert" className="text-xs text-destructive">{passwordFieldErrors[field.id]}</p>}
        </div>)}
        <p className="text-xs text-muted-foreground">Mật khẩu mới phải có từ 12 đến 200 ký tự và khác mật khẩu hiện tại.</p>
        {passwordError&&<p role="alert" className="text-sm text-destructive">{passwordError}</p>}
      </form>
    </AppDrawer>
    <AppDrawer open={profileOpen} onOpenChange={open => {if(!open)requestProfileCancel(true);}} title="Hồ sơ cá nhân"
      busy={profileSaving} bodyClassName="space-y-4 bg-muted/10"
      footer={editingProfile ? <div className="flex w-full flex-wrap justify-end gap-2">
        <AppButton type="button" tone="neutral" disabled={profileSaving} onClick={() => requestProfileCancel(false)}>Hủy</AppButton>
        <AppButton type="submit" form="profile-self-edit-form" busy={profileSaving} disabled={!profileDirty}>Lưu thay đổi</AppButton>
      </div> : undefined}>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <ContactRound aria-hidden="true" className="size-4 text-primary"/>Thông tin cá nhân
          </h3>
          {!editingProfile && <AppButton type="button" tone="outline" className="h-9"
            leadingIcon={<Pencil aria-hidden="true" className="size-4"/>} onClick={startProfileEdit}>Chỉnh sửa</AppButton>}
        </div>
        {editingProfile ? <form id="profile-self-edit-form" noValidate
          onSubmit={event => {event.preventDefault();void saveProfile();}} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor="profile-edit-name" className="text-sm font-medium">Họ và tên *</label>
              <Input id="profile-edit-name" type="text" autoComplete="name" required
                maxLength={190} value={editName} disabled={profileSaving} aria-invalid={!!profileError}
                onChange={event => setEditName(event.target.value)} className="h-10"/>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor="profile-edit-phone" className="text-sm font-medium">Số điện thoại</label>
              <Input id="profile-edit-phone" type="tel" inputMode="tel" autoComplete="tel"
                maxLength={40} value={editPhone} disabled={profileSaving}
                onChange={event => setEditPhone(event.target.value)} className="h-10"/>
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><DetailField label="Email" value={user?.email}/></div>
            <DetailField label="Mã nhân sự" value={user?.code}/>
          </dl>
          {profileError && <p role="alert" className="text-sm text-destructive">{profileError}</p>}
        </form> : <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <DetailField label="Họ và tên" value={user?.name}/>
          <DetailField label="Số điện thoại" value={user?.phone}/>
          <div className="sm:col-span-2"><DetailField label="Email" value={user?.email}/></div>
          <DetailField label="Mã nhân sự" value={user?.code}/>
        </dl>}
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
          Bạn có thể chỉnh sửa họ tên, số điện thoại; thay đổi mật khẩu qua mục Đổi mật khẩu. Email, tổ chức và quyền truy cập do quản trị viên quản lý.
        </p>
      </section>
    </AppDrawer>
    <ConfirmDialog open={discardPrompt} onOpenChange={setDiscardPrompt}
      title="Bỏ thay đổi chưa lưu?" description="Thông tin đang nhập sẽ không được lưu."
      confirmLabel="Bỏ thay đổi" destructive onConfirm={discardProfileEdit}/>
  </>;
}
