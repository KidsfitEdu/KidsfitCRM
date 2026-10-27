import type { ChannelSalesWorkspace } from './channel-sales';

// Product presentation only. Package IDs, prices, permissions and protection rules
// remain authoritative in the existing channel-sales API.
export const productPresentation = {
  brand: 'iSchool & F&B',
  title: 'Đăng ký khách hàng & sản phẩm',
  description:
    'Đăng ký tiếp cận, theo dõi hợp đồng và thu nhập từ phân phối sản phẩm iSchool, F&B.',
} as const;

export type ProductView = 'overview' | 'registrations';
export const channelViewPermission = 'channel_sales.customer.view';

export function productNavigation(abilities: string[]) {
  if (!abilities.includes(channelViewPermission)) return [];
  return [
    { id: 'overview' as const, label: 'Tổng quan', shortLabel: 'Tổng quan' },
    {
      id: 'registrations' as const,
      label: 'Đăng ký khách hàng',
      shortLabel: 'Đăng ký',
    },
  ];
}

export type ProductUser = { name: string; abilities: string[] };
export type ProductRequester = <T>(path: string, token: string) => Promise<T>;

export async function loadProductWorkspace(
  request: ProductRequester,
  token: string,
): Promise<{ user: ProductUser; workspace: ChannelSalesWorkspace | null }> {
  const { user } = await request<{ user: ProductUser }>('/me', token);
  if (!user.abilities.includes(channelViewPermission)) {
    return { user, workspace: null };
  }
  const workspace = await request<ChannelSalesWorkspace>(
    '/channel-sales/workspace',
    token,
  );
  return { user, workspace };
}
