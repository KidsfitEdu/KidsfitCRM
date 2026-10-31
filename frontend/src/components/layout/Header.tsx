'use client';

import { Bell, Moon, Search, Sun } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createApiClient } from '@/services/api.client';
import type { View } from '@/config/navigation';

type Notice = {
  id: number;
  kind: 'ADMIN_OVERDUE' | 'DIRECTOR_ESCALATION';
  created_at: string;
  due_at: string;
  read_at: string | null;
  school_proposal_id: number;
  school_name: string;
  school_code: string;
  message: string;
};
type NotificationsResponse = { unread_count: number; data: Notice[] };
const initials = (name: string) => name.split(' ').slice(-2).map(p => p[0]).join('').toUpperCase();

export function Header({
  todayLabel, userName, search, setSearch, dark, setDark,
  apiBase = '', token = '', onNavigate,
}: {
  todayLabel: string;
  userName: string;
  search: string;
  setSearch: (value: string) => void;
  dark: boolean;
  setDark: (value: boolean | ((current: boolean) => boolean)) => void;
  apiBase?: string;
  token?: string;
  onNavigate?: (view: View) => void;
}) {
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const client = useQueryClient();
  const request = createApiClient(apiBase);
  const queryKey = ['crm-notifications', apiBase, token];
  const notifications = useQuery({
    queryKey,
    queryFn: () => request<NotificationsResponse>('/notifications', token),
    enabled: !!apiBase && !!token,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const openNotice = async (notice: Notice) => {
    setActionError('');
    try {
      if (!notice.read_at) {
        await request('/notifications/' + notice.id + '/read', token, { method: 'POST' });
        await client.invalidateQueries({ queryKey });
      }
      setOpen(false);
      onNavigate?.(notice.kind === 'ADMIN_OVERDUE' ? 'admin-proposals' : 'role-board-overdue');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể đánh dấu thông báo đã đọc.');
    }
  };

  return <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-border/70 bg-card/90 px-4 py-3 backdrop-blur-xl sm:px-7">
    <div>
      <p className="text-xs font-medium text-muted-foreground">{todayLabel}</p>
      <h1 className="mt-1 text-lg font-bold tracking-[-0.03em] sm:text-xl">Chào buổi sáng, {userName}</h1>
    </div>
    <div className="flex items-center gap-2">
      <div className="relative hidden xl:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={event => setSearch(event.target.value)}
          className="h-10 w-64 rounded-xl bg-card pl-9" placeholder="Tìm kiếm nhanh…" />
      </div>
      <Button onClick={() => setDark(value => !value)} variant="outline" size="icon"
        aria-label="Đổi giao diện" className="rounded-xl">{dark ? <Sun /> : <Moon />}</Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" size="icon" aria-label="Thông báo" className="relative rounded-xl" />}>
          <Bell aria-hidden="true" />
          {!!notifications.data?.unread_count && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {notifications.data.unread_count > 99 ? '99+' : notifications.data.unread_count}
          </span>}
        </PopoverTrigger>
        <PopoverContent align="end" className="max-h-[430px] w-[min(90vw,360px)] overflow-y-auto p-3">
          <p className="mb-2 font-semibold">Thông báo công việc</p>
          {!apiBase && <p className="text-sm text-muted-foreground">Chế độ xem trước không có thông báo thật.</p>}
          {notifications.isPending && !!apiBase && <p className="text-sm text-muted-foreground">Đang tải thông báo…</p>}
          {notifications.error && <p role="alert" className="text-sm text-red-600">{notifications.error.message}</p>}
          {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
          {notifications.data?.data.length === 0 && <p className="text-sm text-muted-foreground">Không có đề xuất quá hạn cần xử lý.</p>}
          {notifications.data?.data.map(notice => <button type="button" key={notice.id}
            onClick={() => void openNotice(notice)}
            className="my-1 block w-full rounded-xl border p-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-green-700">
            <span className="block font-semibold">{notice.school_name}</span>
            <span className="mt-1 block text-muted-foreground">{notice.message}</span>
            <span className="mt-1 block text-xs text-muted-foreground">Hạn duyệt: {new Date(notice.due_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
            {!notice.read_at && <span className="mt-1 inline-block text-xs font-semibold text-green-700">Chưa đọc</span>}
          </button>)}
        </PopoverContent>
      </Popover>
      <div className="ml-1 grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-sm font-bold text-[#633b38]">
        {initials(userName)}
      </div>
    </div>
  </header>;
}
