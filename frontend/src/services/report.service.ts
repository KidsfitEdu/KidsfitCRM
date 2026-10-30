import { channelRequest } from '@/lib/channel-operations';
import type { SchoolOperationsReport } from '@/lib/school-operations';

export function fetchAdminReport(apiBase:string,token:string,period:string) {
  return channelRequest<SchoolOperationsReport>(apiBase,token,'/school-operations/report?period='+period);
}
