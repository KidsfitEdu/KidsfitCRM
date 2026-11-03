'use client';

import { useQuery } from '@tanstack/react-query';
import { channelRequest, currentBusinessPeriod } from '@/lib/channel-operations';
import type { SchoolOperationsWorkspace, SchoolOperationsReport } from '@/lib/school-operations';

export function useBoardData(apiBase: string, token: string, period: string, page = 1) {
  const connected = Boolean(apiBase && token);
  const report = useQuery({
    queryKey: ['board', 'report', period, apiBase],
    queryFn: () => channelRequest<SchoolOperationsReport>(apiBase, token,
      '/school-operations/report?period=' + encodeURIComponent(period)),
    enabled: connected,
  });
  const operations = useQuery({
    queryKey: ['board', 'operations', apiBase, page],
    queryFn: () => channelRequest<SchoolOperationsWorkspace>(apiBase, token,
      '/school-operations?page=' + page),
    enabled: connected,
  });
  return { report, operations, connected };
}

export { currentBusinessPeriod };
export const boardNumber = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString('vi-VN') : '—';
export const boardMoney = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString('vi-VN') + ' đ' : '—';
