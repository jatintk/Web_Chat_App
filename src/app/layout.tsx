import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/ui/Header';

export const metadata: Metadata = {
  title: {
    template: '%s | AstroChat',
    default: 'AstroChat',
  },
  description: 'Premium Chat Application with Credits',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
