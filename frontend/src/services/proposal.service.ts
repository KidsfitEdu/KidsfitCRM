import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace } from '@/lib/school-operations';

export function fetchAdminOperations(apiBase:string,token:string,page:number,search:string,status:string='ALL') {
  return channelRequest<SchoolOperationsWorkspace>(apiBase,token,'/school-operations?page='+page+'&search='+encodeURIComponent(search)+(status!=='ALL'?'&status='+encodeURIComponent(status):''));
}
export function reviewAdminProposal(apiBase:string,token:string,id:number,approve:boolean,reason:string,duplicateReviewed:boolean) {
  return channelRequest(apiBase,token,'/school-proposals/'+id+'/admin-review',{method:'POST',body:JSON.stringify({approve,reason,duplicate_reviewed:duplicateReviewed})});
}
export function editAdminProposal(apiBase:string,token:string,id:number,payload:Record<string,string|number>) {
  return channelRequest(apiBase,token,'/school-proposals/'+id,{method:'PATCH',body:JSON.stringify(payload)});
}
export type ProposalRevision = {version:number;reason:string;createdAt:string;actor_name:string};
export function fetchProposalRevisions(apiBase:string,token:string,id:number) {
  return channelRequest<{data:ProposalRevision[]}>(apiBase,token,'/school-proposals/'+id+'/revisions');
}
