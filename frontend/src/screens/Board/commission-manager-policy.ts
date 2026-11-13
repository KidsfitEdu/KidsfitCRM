// Select the current manager override, including a RESET version for concurrency.
// Without an ACTIVE manager override, the team inherits the system default.
export type CommissionManagerVersion = {
  id:number; scope:string; organizationId:number|null; managerUserId:number|null;
  status:string; salesPercent:number; managerPercent:number; createdAt:string;
};
export type CommissionDefaults = {salesPercent:number;managerPercent:number};

export function resolveManagerCommissionForm(
  versions:readonly CommissionManagerVersion[], defaults:CommissionDefaults,
  organizationId:number, managerUserId:number
):{salesPercent:string;managerPercent:string;expectedVersionId:number|null}{
  const latest=versions
    .filter(p=>p.scope==='MANAGER'&&p.organizationId===organizationId&&p.managerUserId===managerUserId)
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id-a.id)[0];
  const current=latest?.status==='ACTIVE'?latest:defaults;
  return {
    salesPercent:String(current.salesPercent),managerPercent:String(current.managerPercent),
    expectedVersionId:latest?.id??null
  };
}
