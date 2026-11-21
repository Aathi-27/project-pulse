'use client';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { ErrorBanner } from './ui';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && !name.trim()) return setError('Name is required.');
    if (!email.trim()) return setError('Email is required.');
    if (mode === 'register' && password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      await api(`/api/auth/${mode}`, { method: 'POST', body: mode === 'register' ? { name, email, password } : { email, password } });
      // Start a fresh document after changing the session cookie. This avoids
      // stale App Router responses racing an auth-boundary navigation.
      const next = params.get('next');
      window.location.assign(next === '/projects' || next?.startsWith('/projects/') ? next : '/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <div className="pp-panel p-6">
      <div className="mb-5 flex rounded-lg p-1" style={{ background: 'var(--panel-2)' }}>
        <Link href="/login" className={`flex-1 rounded-md py-1.5 text-center text-sm font-semibold ${mode === 'login' ? '' : 'opacity-60'}`}
          style={mode === 'login' ? { background: 'var(--panel)', color: 'var(--teal)' } : {}}>
          Log in
        </Link>
        <Link href="/register" className={`flex-1 rounded-md py-1.5 text-center text-sm font-semibold ${mode === 'register' ? '' : 'opacity-60'}`}
          style={mode === 'register' ? { background: 'var(--panel)', color: 'var(--teal)' } : {}}>
          Register
        </Link>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
        <ErrorBanner message={error} />
        {mode === 'register' && (
          <div>
            <label className="pp-label" htmlFor="name">Name</label>
            <input id="name" className="pp-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice" autoComplete="name" required />
          </div>
        )}
        <div>
          <label className="pp-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="pp-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
        </div>
        <div>
          <label className="pp-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="pp-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required />
        </div>
        <button type="submit" className="pp-btn pp-btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
