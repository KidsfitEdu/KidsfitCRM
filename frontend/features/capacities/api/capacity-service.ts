import { channelRequest } from '@/lib/channel-operations';

export type Capacity = {
  id: number;
  name: string;
  organization_name: string;
  school_approach_limit: number;
  active: number;
  history: {
    previous_limit: number;
    new_limit: number;
    reason: string;
    created_at: string;
  }[];
};

/** Channel-sales API contracts are preserved; permission checks remain on the server. */
export function fetchCapacityRows(base: string, token: string) {
  return channelRequest<{ data: Capacity[] }>(base, token, '/school-capacities');
}

export function saveCapacityLimit(
  base: string,
  token: string,
  personnelId: number,
  limit: number,
  reason: string,
) {
  return channelRequest<unknown>(base, token, `/school-capacities/${personnelId}`, {
    method: 'PATCH',
    body: JSON.stringify({ limit, reason }),
  });
}
