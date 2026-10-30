'use client';
import { SchoolOperations } from '@/components/crm/school-operations';
import type { ManagerPageProps } from '@/types/manager-pages';
import { managerPageSections, type ManagerPageSection } from '@/config/role-pages';
export function ManagerOperationsPage({section,...props}:ManagerPageProps&{section:Exclude<ManagerPageSection,'dashboard'>}){
 const allowed=props.abilities.includes('*')||props.abilities.includes('channel_sales.school.allocation.manage');
 if(!allowed)return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">Tài khoản không có quyền Quản lý bán hàng.</p>;
 const target=managerPageSections.SalesManager[section];
 return <SchoolOperations key={section} {...props} initialTab={target.panel} hideTabs/>;
}
