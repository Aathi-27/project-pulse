import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Project Pulse',
  description: 'Collaborative project management: boards, tasks, real-time teamwork.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
