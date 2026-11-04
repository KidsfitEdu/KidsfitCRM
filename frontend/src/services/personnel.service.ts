import { channelRequest, type ChannelManagement } from '@/lib/channel-operations';

export function fetchAdminManagement(apiBase:string,token:string) {
  return channelRequest<ChannelManagement>(apiBase,token,'/management');
}
export function createAdminTeamMember(apiBase:string,token:string,payload:{name:string;email:string;password:string;organization_id:number;role_code:string;manager_user_id?:number|null}) {
  return channelRequest(apiBase,token,'/team',{method:'POST',body:JSON.stringify(payload)});
}

export function updateAdminTeamMember(base:string,token:string,id:number,payload:{name:string;phone:string|null;role_code:string;reason?:string;manager_user_id?:number|null}) {
  return channelRequest(base,token,`/admin/team/${id}`,{method:'PATCH',body:JSON.stringify(payload)});
}
export function changeTeamStatus(base:string,token:string,id:number,payload:{status:'ACTIVE'|'SUSPENDED';reason:string;summary?:string;idempotency_key?:string}) {
  return channelRequest(base,token,`/team/${id}/status`,{method:'PATCH',body:JSON.stringify(payload)});
}
export function completeTeamHandover(base:string,token:string,id:number,payload:{reason:string;summary:string;suspend_account:boolean;idempotency_key:string}) {
  return channelRequest(base,token,`/school-handovers/${id}`,{method:'POST',body:JSON.stringify(payload)});
}
export function reactivateTeam(base:string,token:string,id:number,payload:{reason:string;reactivate_account:boolean}) {
  return channelRequest(base,token,`/school-team/${id}/reactivate`,{method:'POST',body:JSON.stringify(payload)});
}
export function createAdminPartner(base:string,token:string,payload:{code:string;name:string}) {
  return channelRequest(base,token,'/admin/partners',{method:'POST',body:JSON.stringify(payload)});
}
export function updateAdminPartner(base:string,token:string,id:number,payload:{name:string;status:'ACTIVE'|'SUSPENDED';reason:string}) {
  return channelRequest(base,token,`/admin/partners/${id}`,{method:'PATCH',body:JSON.stringify(payload)});
}
