import { nav, type View } from './navigation';

/** Internal URL convention. Vinext owns /crm/[view]; static Pages demo keeps root-only navigation. */
const ids = new Set<View>([...nav.map(item=>item.id),'role-board-oversight','channel-sales',
  'role-checkee-reconciliation','role-checkee-disputes','role-checkee-history']);
/** Preserve old bookmarks after consolidating CHECKEE workflows into Verification. */
export const canonicalCheckeeView = (view: View): View =>
  ['role-checkee-reconciliation','role-checkee-disputes','role-checkee-history'].includes(view)
    ? 'role-checkee-verification' : view;
/** Redirect historic Board report deep links to the merged executive dashboard. */
export const canonicalCareView = (view: View): View =>
  (view === 'role-customer-care-handover' || view === 'role-customer-care-followup')
    ? 'role-customer-care-customers' : view;

export const canonicalBoardView = (view: View): View =>
  view === 'role-board-oversight' ? 'role-board-dashboard' : view;
export function isView(value:string):value is View{return ids.has(value as View);}
export function pathToView(pathname:string):View|null {
  const match=pathname.match(/^\/crm\/([a-z0-9-]+)\/?$/);
  return match && isView(match[1]) ? match[1] : null;
}
export function viewToPath(view:View):string {return '/crm/'+view;}
