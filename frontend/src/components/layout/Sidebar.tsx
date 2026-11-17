'use client';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AppBrand } from '@/components/common/app-brand';
import { nav, type View } from '@/config/navigation';

type Props={sidebarOpen:boolean;onToggle:()=>void;visibleNav:typeof nav;currentView:View;onNavigate:(view:View)=>void;userName:string;membershipType:string|null;organizationName:string|null;isAdminWorkspace:boolean;apiBase:string;onLogout:()=>void};
const initials=(name:string)=>name.split(' ').slice(-2).map(p=>p[0]).join('').toUpperCase();
export function Sidebar({sidebarOpen,onToggle,visibleNav,currentView,onNavigate,userName,membershipType,organizationName,isAdminWorkspace,apiBase,onLogout}:Props){
return <>
      <aside className={`crm-brand-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/10 text-white transition-[width] duration-200 motion-reduce:transition-none lg:flex ${sidebarOpen ? "w-[248px]" : "w-[72px]"}`}>
        <div className={`flex shrink-0 items-center gap-2 ${sidebarOpen ? "h-20 justify-between px-4" : "flex-col px-2 pt-3 pb-2"}`}>
          <AppBrand inverted compact={!sidebarOpen} />
          <button type="button" onClick={onToggle}
            aria-label={sidebarOpen ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
            title={sidebarOpen ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
            aria-expanded={sidebarOpen} aria-controls="crm-desktop-navigation"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[#c7ddcc] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a5d6a7]">
            {sidebarOpen ? <PanelLeftClose aria-hidden="true" className="size-[18px]" /> : <PanelLeftOpen aria-hidden="true" className="size-[18px]" />}
          </button>
        </div>
        <nav id="crm-desktop-navigation" className={`crm-scrollbar-sidebar min-h-0 flex-1 space-y-1 overflow-y-auto pb-4 ${sidebarOpen ? "mt-4 px-3" : "mt-2 px-2"}`} aria-label="Điều hướng chính">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={!sidebarOpen ? item.label : undefined}
              aria-label={item.label}
              aria-current={currentView === item.id ? 'page' : undefined}
              className={`flex w-full items-center rounded-xl py-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a5d6a7] ${sidebarOpen ? 'gap-3 px-3' : 'justify-center px-2'} ${currentView === item.id ? 'crm-brand-menu-active font-semibold text-white' : 'text-[#c7ddcc] hover:bg-white/10 hover:text-white'}`}
            >
              <item.icon aria-hidden="true"
                className={`size-[18px] shrink-0 ${currentView === item.id ? 'text-[#a5d6a7]' : ''}`}
              />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className={`mb-5 flex shrink-0 items-center gap-3 rounded-xl p-2 ${sidebarOpen ? "mx-4" : "mx-2 flex-col"}`}>
          <div title={!sidebarOpen ? userName : undefined} aria-label={userName} className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-xs font-bold text-[#633b38]">
            {initials(userName)}
          </div>
          {sidebarOpen && <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="text-[11px] text-slate-400">
              {(isAdminWorkspace ? 'Quản trị viên' : membershipType === 'COLLABORATOR' || membershipType === 'PARTNER_COLLABORATOR' ? 'CTV' : membershipType === 'SALES' ? 'Nhân viên bán hàng' : membershipType === 'SALES_MANAGER' || membershipType === 'PARTNER_ADMIN' ? 'Quản lý bán hàng' : 'Thành viên CRM')}{organizationName ? ` · ${organizationName}` : ''}
            </p>
          </div>}
          {apiBase && (
            <button
              onClick={onLogout}
              aria-label="Đăng xuất" title="Đăng xuất"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a5d6a7]"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </aside>


      <nav
        className="fixed inset-x-3 bottom-3 z-40 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-[var(--deep)]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl lg:hidden"
        aria-label="Điều hướng di động"
      >
        {visibleNav.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex min-w-[88px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] transition-colors ${currentView === item.id ? 'bg-[#e8f5e9]/15 text-[#a5d6a7]' : 'text-slate-400'}`}
          >
            <item.icon className="size-[18px]" />
            <span>{item.shortLabel}</span>
          </button>
        ))}
      </nav>


</>;
}
