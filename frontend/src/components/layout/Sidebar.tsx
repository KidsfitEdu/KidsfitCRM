'use client';
import { LogOut } from 'lucide-react';
import { AppBrand } from '@/components/common/app-brand';
import { nav, type View } from '@/src/config/navigation';
import type { DemoAccount } from '@/lib/demo-auth';

type Props={visibleNav:typeof nav;currentView:View;onNavigate:(view:View)=>void;userName:string;demoAccount?:DemoAccount;membershipType:string|null;organizationName:string|null;isAdminWorkspace:boolean;apiBase:string;onLogout:()=>void};
const initials=(name:string)=>name.split(' ').slice(-2).map(p=>p[0]).join('').toUpperCase();
export function Sidebar({visibleNav,currentView,onNavigate,userName,demoAccount,membershipType,organizationName,isAdminWorkspace,apiBase,onLogout}:Props){
return <>
      <aside className="crm-brand-sidebar fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-white/10 text-white lg:flex">
        <div className="flex h-20 items-center px-5"><AppBrand inverted /></div>
        <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Điều hướng chính">
          {visibleNav.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-all ${currentView === item.id ? 'crm-brand-menu-active font-semibold text-white' : 'text-[#c7ddcc] hover:bg-white/10 hover:text-white'}`}
            >
              <item.icon
                className={`size-[18px] ${currentView === item.id ? 'text-[#a5d6a7]' : ''}`}
              />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mx-4 mb-5 flex shrink-0 items-center gap-3 rounded-xl p-2">
          <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#ffcf9f] to-[#f4978e] text-xs font-bold text-[#633b38]">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="text-[11px] text-slate-400">
              {demoAccount?.roleLabel ?? (isAdminWorkspace ? 'Quản trị viên' : membershipType === 'COLLABORATOR' || membershipType === 'PARTNER_COLLABORATOR' ? 'CTV' : membershipType === 'SALES' ? 'Nhân viên bán hàng' : membershipType === 'SALES_MANAGER' || membershipType === 'PARTNER_ADMIN' ? 'Quản lý bán hàng' : 'Thành viên CRM')}{organizationName ? ` · ${organizationName}` : ''}
            </p>
          </div>
          {(apiBase || demoAccount) && (
            <button
              onClick={onLogout}
              aria-label="Đăng xuất"
              className="text-slate-400 hover:text-white"
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
