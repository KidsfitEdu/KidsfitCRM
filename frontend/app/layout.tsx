import { AppToastProvider } from '@/components/common/app-toast-provider';
import type { Metadata } from 'next';

import './globals.css';


export const metadata: Metadata = {
  title: 'Kidsfit CRM — Giáo dục & CHECKEE',
  description:
    'Không gian vận hành giáo dục và quản lý quyền bảo vệ khách hàng CHECKEE.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className="antialiased"
      >
        <AppToastProvider>{children}</AppToastProvider>
      </body>
    </html>
  );
}
