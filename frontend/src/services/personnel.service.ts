import { channelRequest, type ChannelManagement } from '@/lib/channel-operations';

export function fetchAdminManagement(apiBase:string,token:string) {
  return channelRequest<ChannelManagement>(apiBase,token,'/management');
}
export function createAdminTeamMember(apiBase:string,token:string,payload:{name:string;email:string;password:string;organization_id:number;role_code:string}) {
  return channelRequest(apiBase,token,'/team',{method:'POST',body:JSON.stringify(payload)});
}
