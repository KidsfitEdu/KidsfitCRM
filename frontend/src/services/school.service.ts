import { channelRequest } from '@/lib/channel-operations';

export function createManualSchool(apiBase:string,token:string,payload:Record<string,string>) {
  return channelRequest(apiBase,token,'/schools/manual',{method:'POST',body:JSON.stringify(payload)});
}
