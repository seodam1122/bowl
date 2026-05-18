import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';

export const dynamic = 'force-dynamic';
import SidebarLayout from '@/components/SidebarLayout';
import ClientInit from '@/components/ClientInit';
import SupabaseEnvScript from '@/components/SupabaseEnvScript';
import '@/app/globals.css';

const notoSans = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: '온스코어링 | 볼링원',
  description: '볼링장 스코어링 관리 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={notoSans.className}>
        <SupabaseEnvScript />
        <ClientInit />
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}
