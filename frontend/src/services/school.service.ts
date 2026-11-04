import { channelRequest } from '@/lib/channel-operations';

export function createManualSchool(apiBase:string,token:string,payload:Record<string,string>) {
  return channelRequest(apiBase,token,'/schools/manual',{method:'POST',body:JSON.stringify(payload)});
}

export function updateSchoolUnit(apiBase:string,token:string,id:number,payload:Record<string,unknown>) {
  return channelRequest(apiBase,token,`/school-units/${id}`,{method:'PATCH',body:JSON.stringify(payload)});
}
export function archiveSchool(apiBase:string,token:string,id:number) {
  return channelRequest(apiBase,token,`/schools/${id}/soft-delete`,{method:'POST',body:JSON.stringify({})});
}
export function restoreSchool(apiBase:string,token:string,id:number) {
  return channelRequest(apiBase,token,`/schools/${id}/restore`,{method:'POST'});
}
