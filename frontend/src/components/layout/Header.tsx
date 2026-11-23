'use client';

import { Bell, CalendarClock, FileText, Headset, Moon, PanelLeftClose, PanelLeftOpen, School, Search, Sun, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createApiClient } from '@/services/api.client';
import { UserProfileMenu, type CurrentUserProfile } from '@/components/layout/UserProfileMenu';
import type { View } from '@/config/navigation';

type WorkflowNotice = {
  id: number;
  kind: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: number;
  target_view: View;
  created_at: string;
  read_at: string | null;
  status: string;
};
type WorkflowNotificationsResponse = { unread_count: number; data: WorkflowNotice[]; page: number };

function notificationIcon(kind: string) {
  if (/PAYOUT|COMMISSION|REVENUE/.test(kind)) return Wallet;
  if (/EXTENSION|RENEWAL|EXPIRED|SERVICE_|PROTECTION_|GI01_/.test(kind)) return CalendarClock;
  if (/CONTRACT|CHECKEE|PROPOSAL/.test(kind)) return FileText;
  if (/CARE|SUPPORT/.test(kind)) return Headset;
  if (/INVITATION|APPROACH/.test(kind)) return School;
  return Bell;
}

function notificationTime(value: string): string {
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return '';
  const difference = Date.now() - created.getTime();
  if (difference >= 0 && difference < 60_000) return 'Vừa xong';
  if (difference >= 0 && difference < 60 * 60_000) return `${Math.floor(difference / 60_000)} phút trước`;
  return created.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function Header({
  todayLabel, userName, search, setSearch, dark, setDark,
  apiBase = '', token = '', onNavigate, sidebarOpen, onToggleSidebar, profile, onLogout, isAdmin, avatarUrl, onAvatarChanged, onProfileUpdated,
}: {
  todayLabel: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  userName: string;
  search: string;
  setSearch: (value: string) => void;
  dark: boolean;
  setDark: (value: boolean | ((current: boolean) => boolean)) => void;
  apiBase?: string;
  token?: string;
  onNavigate?: (view: View) => void;
  profile: CurrentUserProfile | null;
  onLogout: () => Promise<void>;
  isAdmin: boolean;
  avatarUrl: string | null;
  onAvatarChanged: () => void;
  onProfileUpdated: (profile: CurrentUserProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [noticeFilter, setNoticeFilter] = useState<'ALL' | 'UNREAD' | 'ACTION'>('ALL');
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const measure = () => {
      if (headerRef.current)
        document.documentElement.style.setProperty('--crm-header-height', `${Math.ceil(headerRef.current.getBoundingClientRect().height)}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      document.documentElement.style.removeProperty('--crm-header-height');
    };
  }, []);
  const [actionError, setActionError] = useState('');
  const client = useQueryClient();
  const request = createApiClient(apiBase);
  const workflowQueryKey = ['crm-workflow-notifications', apiBase, token];
  const workflowNotifications = useQuery({
    queryKey: workflowQueryKey,
    queryFn: () => request<WorkflowNotificationsResponse>('/notifications', token),
    enabled: !!apiBase && !!token,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const unreadTotal = workflowNotifications.data?.unread_count ?? 0;

  const openWorkflowNotice = async (notice: WorkflowNotice) => {
    setActionError('');
    try {
      if (!notice.read_at) {
        await request('/notifications/' + notice.id + '/read', token, { method: 'POST' });
        await client.invalidateQueries({ queryKey: workflowQueryKey });
      }
      // Deliver the selected entity ID to the destination page without encoding sensitive data in the URL.
      window.sessionStorage.setItem('crm-notification-target', JSON.stringify({
        view: notice.target_view, entityType: notice.entity_type, entityId: notice.entity_id,
      }));
      onNavigate?.(notice.target_view);
      window.dispatchEvent(new Event('crm-notification-open'));
      setOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể mở thông báo.');
    }
  };
  // All workflow, overdue school-proposal and contract milestone notices come from one inbox.
  const noticeItems = [
    ...(workflowNotifications.data?.data.map(notice => ({
      key: 'workflow-' + notice.id,
      createdAt: notice.created_at,
      readAt: notice.read_at,
      title: notice.title,
      message: notice.message,
      kind: notice.kind,
      actionable: [
        'SCHOOL_EXTENSION_REQUESTED', 'SCHOOL_PROPOSAL_SUBMITTED',
        'SCHOOL_PROPOSAL_FORWARDED', 'SCHOOL_INVITATION_NEW', 'SCHOOL_CONTRACT_REPORTED',
        'CONTRACT_FORWARDED_TO_CHECKEE', 'PAYOUT_SUBMITTED', 'SUPPORT_CASE_FORWARDED',
      ].includes(notice.kind) && notice.status === 'OPEN',
      resolved: notice.status !== 'OPEN',
      onOpen: () => openWorkflowNotice(notice),
    })) ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const visibleNotices = noticeItems.filter(notice => noticeFilter === 'ALL'
    || (noticeFilter === 'UNREAD' ? !notice.readAt && !notice.resolved : notice.actionable));

  return <header ref={headerRef} className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-2 border-b border-border/70 bg-card/95 px-3 py-3 backdrop-blur-xl sm:gap-3 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <Button type="button" variant="outline" size="icon" onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
        title={sidebarOpen ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
        aria-expanded={sidebarOpen} aria-controls="crm-desktop-navigation"
        className="hidden size-9 shrink-0 rounded-xl lg:inline-flex">
        {sidebarOpen ? <PanelLeftClose aria-hidden="true" className="size-4" /> : <PanelLeftOpen aria-hidden="true" className="size-4" />}
      </Button>
      <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{todayLabel}</p>
      <h1 className="mt-0.5 max-w-[38vw] truncate text-base font-bold tracking-tight text-foreground sm:max-w-none sm:text-xl" title={userName}>Xin chào, {userName}</h1>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger render={<Button variant="outline" size="icon" aria-label="Mở tìm kiếm" className="rounded-xl xl:hidden" />}>
          <Search aria-hidden="true" className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(90vw,360px)] p-3">
          <label htmlFor="crm-mobile-search" className="mb-2 block text-xs font-semibold text-muted-foreground">Tìm kiếm nhanh</label>
          <Input id="crm-mobile-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm kiếm nhanh…" />
        </PopoverContent>
      </Popover>
      <div className="relative hidden xl:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={event => setSearch(event.target.value)}
          aria-label="Tìm kiếm nhanh" className="h-10 w-64 rounded-xl bg-card pl-9" placeholder="Tìm kiếm nhanh…" />
      </div>
      <Button onClick={() => setDark(value => !value)} variant="outline" size="icon"
        aria-label="Đổi giao diện" className="rounded-xl">{dark ? <Sun /> : <Moon />}</Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" size="icon" aria-label="Thông báo" className="relative rounded-xl" />}>
          <Bell aria-hidden="true" />
          {unreadTotal > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(92vw,380px)] gap-0 overflow-hidden rounded-2xl !p-0 shadow-xl">
          <div className="shrink-0 border-b border-border/60 px-4 pb-2.5 pt-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-foreground">
                <Bell aria-hidden="true" className="size-4 text-primary" />
                Thông báo
                {unreadTotal > 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {unreadTotal > 99 ? '99+' : unreadTotal} mới
                </span>}
              </h2>
              <span className="shrink-0 text-[11px] text-muted-foreground">Gần đây</span>
            </div>
            <fieldset aria-label="Lọc thông báo" className="flex gap-0.5 rounded-xl bg-muted/60 p-1">
              {(['ALL', 'UNREAD', 'ACTION'] as const).map(filter => <button type="button" key={filter}
                aria-pressed={noticeFilter === filter}
                onClick={() => setNoticeFilter(filter)}
                className={`min-h-9 flex-1 rounded-lg px-1.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${noticeFilter === filter ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/70'}`}>
                {filter === 'ALL' ? 'Tất cả' : filter === 'UNREAD' ? 'Chưa đọc' : 'Cần xử lý'}
              </button>)}
            </fieldset>
          </div>
          <div className="max-h-[min(55dvh,355px)] min-h-0 overflow-y-auto overscroll-contain px-2 py-1.5">
            {!apiBase && <p className="px-2 py-4 text-sm text-muted-foreground">Chế độ xem trước không có thông báo thật.</p>}
            {workflowNotifications.isPending && !!apiBase &&
              <p role="status" className="px-2 py-4 text-sm text-muted-foreground">Đang tải thông báo…</p>}
            {workflowNotifications.error &&
              <p role="alert" className="px-2 py-2 text-sm text-destructive">{workflowNotifications.error.message}</p>}
            {actionError && <p role="alert" className="px-2 py-2 text-sm text-destructive">{actionError}</p>}
            {visibleNotices.length === 0 && !workflowNotifications.isPending &&
              <p className="px-2 py-7 text-center text-sm text-muted-foreground">Không có thông báo phù hợp.</p>}
            <div className="divide-y divide-border/50">
              {visibleNotices.map(notice => {
                const NoticeIcon = notificationIcon(notice.kind);
                const unread = !notice.readAt && !notice.resolved;
                return <button type="button" key={notice.key} aria-label={`Mở thông báo: ${notice.title}`}
                  onClick={() => void notice.onOpen()}
                  className={`group flex w-full items-start gap-2.5 rounded-lg px-2 py-3 text-left transition-colors hover:bg-accent/70 focus-visible:outline-2 focus-visible:outline-primary ${unread ? 'bg-primary/[0.035]' : ''}`}>
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
                    <NoticeIcon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex min-w-0 items-start gap-1.5">
                      <span className={`min-w-0 flex-1 truncate text-[13px] leading-5 ${unread ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'}`} title={notice.title}>
                        {notice.title}
                      </span>
                      {unread && <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="line-clamp-2 break-words text-xs leading-[18px] text-muted-foreground" title={notice.message}>
                      {notice.message}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground/90">
                      <span>{notificationTime(notice.createdAt)}</span>
                      {notice.resolved && <span>· Đã xử lý</span>}
                      {notice.actionable && <span className="font-semibold text-primary">· Cần xử lý</span>}
                    </span>
                  </span>
                </button>;
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <UserProfileMenu user={profile} dark={dark} setDark={setDark} onLogout={onLogout} isAdmin={isAdmin}
        apiBase={apiBase} token={token} avatarUrl={avatarUrl} onAvatarChanged={onAvatarChanged} onProfileUpdated={onProfileUpdated}/>
    </div>
  </header>;
}
