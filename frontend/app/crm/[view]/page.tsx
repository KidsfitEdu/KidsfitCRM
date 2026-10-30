import { CrmApp } from '@/components/crm/crm-app';
import { isView } from '@/src/config/routes';
import { notFound } from 'next/navigation';

/** Role-specific deep link, validated against known view IDs. Runtime permissions
 * are still enforced by the user session and the backend. */
export default async function CrmViewRoute({params}:{params:Promise<{view:string}>}){
  const {view}=await params;
  if(!isView(view))notFound();
  return <CrmApp initialView={view}/>;
}
