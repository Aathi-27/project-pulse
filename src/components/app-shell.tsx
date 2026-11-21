'use client';
import React from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { Avatar } from './ui';

interface UserLite { id: string; name: string; email: string }

export function AppShell({ user, children }: { user: UserLite; children: React.ReactNode }) {
  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    window.location.assign('/login');
  }
  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 flex-col border-r sm:flex" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <div className="px-5 py-5 text-lg font-bold tracking-tight">
          Project <span style={{ color: 'var(--teal)' }}>Pulse</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          <Link href="/projects" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/5" style={{ color: 'var(--ink-2)' }}>
            My projects
          </Link>
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <Avatar name={user.name} size={30} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{user.email}</div>
          </div>
          <button type="button" onClick={logout} className="pp-btn pp-btn-ghost !px-2 !py-1 text-xs" title="Log out">Log out</button>
        </div>
      </aside>
      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 sm:hidden" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
          <Link href="/projects" className="text-base font-bold">Project <span style={{ color: 'var(--teal)' }}>Pulse</span></Link>
          <div className="flex items-center gap-2">
            <Avatar name={user.name} size={26} />
            <button type="button" onClick={logout} className="pp-btn pp-btn-ghost !px-2 !py-1 text-xs">Log out</button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
