import { channelRequest } from '@/lib/channel-operations';
import type { Capacity } from '@/src/types/capacity';

export function fetchCapacities(apiBase: string, token: string) {
  return channelRequest<{ data: Capacity[] }>(apiBase, token, '/school-capacities');
}

export function updateCapacity(apiBase: string, token: string, personnelId: number, limit: number, reason: string) {
  return channelRequest(apiBase, token, '/school-capacities/' + personnelId, {
    method: 'PATCH',
    body: JSON.stringify({ limit, reason }),
  });
}
