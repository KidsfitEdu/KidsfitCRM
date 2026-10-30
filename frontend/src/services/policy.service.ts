import { fetchAdminOperations } from './proposal.service';

/** The existing backend serves policy versions through school-operations. */
export function fetchAdminPolicies(apiBase:string,token:string) {
  return fetchAdminOperations(apiBase,token,1,'');
}
