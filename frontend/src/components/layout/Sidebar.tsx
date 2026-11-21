'use client';

import { useEffect, useState } from 'react';
import { Ellipsis, LogOut } from 'lucide-react';
import { AppBrand } from '@/components/common/app-brand';
import { AppDialog } from '@/components/common/dialogs/app-dialog';
import { nav, type View } from '@/config/navigation';

type Props = {
  sidebarOpen: boolean;
  visibleNav: typeof nav;
  currentView: View;
  onNavigate: (view: View) => void;
  userName: string;
  membershipType: string | null;
  organizationName: string | null;
  isAdminWorkspace: boolean;
  apiBase: string;
  onLogout: () => void;
  avatarUrl?: string | null;
};

const initials = (name: string) => name.split(' ').slice(-2).map(part => part[0]).join('').toUpperCase();

/** One navigation source for all seven business roles: desktop rail + expanding pill mobile navigation. */
export function Sidebar({ sidebarOpen, visibleNav, currentView, onNavigate, userName, membershipType,
  organizationName, isAdminWorkspace, apiBase, onLogout, avatarUrl }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const mobilePrimary = visibleNav.slice(0, 3);
  const mobileOverflow = visibleNav.slice(3);
  const moreActive = mobileOverflow.some(item => item.id === currentView);
  useEffect(() => { setMoreOpen(false); }, [currentView]);

  const navigate = (view: View) => {
    setMoreOpen(false);
    onNavigate(view);
  };

  const membershipLabel = isAdminWorkspace ? 'Quản trị viên'
    : membershipType === 'COLLABORATOR' || membershipType === 'PARTNER_COLLABORATOR' ? 'CTV'
    : membershipType === 'SALES' ? 'Nhân viên bán hàng'
    : membershipType === 'SALES_MANAGER' || membershipType === 'PARTNER_ADMIN' ? 'Quản lý bán hàng'
    : 'Thành viên CRM';

  return <>
    <aside className={`crm-brand-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/10 text-white transition-[width] duration-200 motion-reduce:transition-none lg:flex ${sidebarOpen ? 'w-[248px]' : 'w-[72px]'}`}>
      <div className={`flex shrink-0 items-center ${sidebarOpen ? 'h-20 px-4' : 'justify-center px-1 pb-2 pt-3'}`}>
        <AppBrand inverted compact={!sidebarOpen} />
      </div>
      <nav id="crm-desktop-navigation" className={`crm-scrollbar-sidebar mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4 ${sidebarOpen ? 'px-3' : 'px-2'}`} aria-label="Điều hướng chính">
        {visibleNav.map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)}
          title={!sidebarOpen ? item.label : undefined} aria-label={item.label}
          aria-current={currentView === item.id ? 'page' : undefined}
          className={`flex min-h-11 w-full items-center rounded-xl py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a5d6a7] ${sidebarOpen ? 'gap-3 px-3' : 'justify-center px-2'} ${currentView === item.id ? 'crm-brand-menu-active font-semibold text-white' : 'text-[#c7ddcc] hover:bg-white/10 hover:text-white'}`}>
          <item.icon aria-hidden="true" className={`size-[18px] shrink-0 ${currentView === item.id ? 'text-[#a5d6a7]' : ''}`} />
          {sidebarOpen && <span className="min-w-0 leading-snug">{item.label}</span>}
        </button>)}
      </nav>
      <div className={`mx-2 mb-5 flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5 ${!sidebarOpen ? 'flex-col' : ''}`}>
        <div aria-label={userName} title={!sidebarOpen ? userName : undefined}
          className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e6f2de] text-xs font-bold text-[#164529]">
          {avatarUrl ? <span aria-hidden="true" className="block size-full bg-cover bg-center" style={{ backgroundImage: `url("${avatarUrl}")` }}/> : initials(userName)}
        </div>
        {sidebarOpen && <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{userName}</p>
          <p className="line-clamp-2 text-[11px] text-[#c7ddcc]">{membershipLabel}{organizationName ? ` · ${organizationName}` : ''}</p>
        </div>}
        {apiBase && <button type="button" onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-[#c7ddcc] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#a5d6a7]">
          <LogOut aria-hidden="true" className="size-4" />
        </button>}
      </div>
    </aside>

    <nav className="crm-mobile-dock fixed inset-x-3 z-40 flex items-center gap-1 rounded-full border border-white/15 bg-[var(--deep)]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl lg:hidden"
      aria-label="Điều hướng di động">
      {mobilePrimary.map(item => {
        const active = currentView === item.id;
        return <button key={item.id} type="button" onClick={() => navigate(item.id)}
          aria-label={item.label} aria-current={active ? 'page' : undefined}
          title={item.label}
          className={`crm-mobile-dock-item flex h-12 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#a5d6a7] ${active ? 'flex-[1.85] bg-[#168355] text-white' : 'flex-1 text-[#d2e2d5] hover:bg-white/10'}`}>
          <item.icon aria-hidden="true" className="size-[18px] shrink-0" />
          {active && <span className="min-w-0 truncate whitespace-nowrap">{item.shortLabel}</span>}
        </button>;
      })}
      {mobileOverflow.length > 0 && <button type="button" onClick={() => setMoreOpen(true)}
        aria-label="Xem tất cả chức năng" aria-haspopup="dialog" aria-expanded={moreOpen}
        title="Thêm chức năng"
        className={`crm-mobile-dock-item flex h-12 min-w-0 items-center justify-center gap-2 rounded-full px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#a5d6a7] ${moreActive ? 'flex-[1.85] bg-[#168355] text-white' : 'flex-1 text-[#d2e2d5] hover:bg-white/10'}`}>
        <Ellipsis aria-hidden="true" className="size-[18px] shrink-0" />
        {moreActive && <span className="min-w-0 truncate whitespace-nowrap">Thêm</span>}
      </button>}
    </nav>
    {mobileOverflow.length > 0 && <AppDialog open={moreOpen} onOpenChange={setMoreOpen}
      title="Tất cả chức năng" description="Chọn màn hình trong phạm vi quyền truy cập của bạn."
      contentClassName="sm:max-w-lg" bodyClassName="pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <nav aria-label="Danh sách chức năng" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleNav.map(item => <button key={item.id} type="button" onClick={() => navigate(item.id)}
          aria-current={currentView === item.id ? 'page' : undefined}
          className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary ${currentView === item.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-accent'}`}>
          <item.icon aria-hidden="true" className="size-5 shrink-0" />
          <span className="min-w-0 break-words">{item.label}</span>
        </button>)}
      </nav>
    </AppDialog>}
  </>;
}
