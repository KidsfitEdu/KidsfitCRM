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

export type AdminProposalUnit = {
  id?:number; unit_type:'MAIN'|'BRANCH'; name:string; province:string; ward:string;
  address:string|null; contact_name:string|null; contact_position:string|null;
  contact_phone:string|null; email:string|null; school_phone:string|null; note:string|null;
};
export type AdminProposalProfile = {
  id:number; version:number; status:string; proposal_mode:'LEGACY'|'NEW_MAIN'|'ADD_BRANCHES';
  target_directory_school_id:number|null; name:string; province:string; ward:string;
  address:string|null; contact_name:string|null; contact_position:string|null;
  contact_phone:string|null; email:string|null; reason:string;
  review_due_at:string; decision_reason:string|null; submitted_by:string;
  manager_name:string; can_edit:boolean; units:AdminProposalUnit[]; target:AdminProposalUnit|null;
};
export function fetchAdminProposalProfile(apiBase:string,token:string,id:number) {
  return channelRequest<{data:AdminProposalProfile}>(apiBase,token,`/school-proposals/${id}/admin-profile`);
}
export function updateAdminProposalProfile(apiBase:string,token:string,id:number,payload:{
  expected_version:number; reason?:string; units:AdminProposalUnit[];
}) {
  // Keep compatibility with older deployed API versions that still require a
  // reason. This is an internal audit description, not a user-entered field.
  const reason = payload.reason?.trim() || 'Admin cập nhật thông tin đề xuất trường.';
  return channelRequest(apiBase,token,`/school-proposals/${id}/admin-profile`,{
    method:'PUT',body:JSON.stringify({...payload,reason}),
  });
}
