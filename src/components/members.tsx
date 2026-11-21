'use client';
import React, { useCallback, useState } from 'react';
import { api } from '@/lib/client-api';
import { useProjectSocket } from '@/lib/use-socket';
import { useProject } from './project-shell';
import { Avatar, ErrorBanner, Field } from './ui';

export function Members({ projectId }: { projectId: string }) {
  const { project, refresh, leaveIfDeleted } = useProject();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isOwner = project.role === 'OWNER';

  const onSocketEvent = useCallback((event: string) => {
    if (event === 'project:deleted') return leaveIfDeleted();
    if (event === 'member:added' || event === 'member:removed' || event === 'project:updated') refresh();
  }, [refresh, leaveIfDeleted]);
  useProjectSocket(projectId, onSocketEvent);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setNotice(null);
    setBusy(true);
    try {
      const m = await api<{ user: { name: string } }>(`/api/projects/${projectId}/members`, { method: 'POST', body: { email: email.trim() } });
      setNotice(`${m.user.name} added to the project.`);
      setEmail('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the member.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(memberId: string, name: string) {
    if (!window.confirm(`Remove ${name} from the project? Their assigned tasks become unassigned.`)) return;
    setError(null);
    try {
      await api(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the member.');
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="pp-panel">
        <div className="border-b px-5 py-3 text-sm font-semibold" style={{ borderColor: 'var(--border)' }}>
          {project.members.length} member{project.members.length === 1 ? '' : 's'}
        </div>
        <ul>
          {project.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 border-b px-5 py-3 last:border-0" style={{ borderColor: 'var(--border)' }}>
              <Avatar name={m.user.name} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{m.user.name}</div>
                <div className="truncate text-xs" style={{ color: 'var(--ink-3)' }}>{m.user.email}</div>
              </div>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: 'var(--panel-2)', color: m.role === 'OWNER' ? 'var(--teal)' : 'var(--ink-2)' }}>
                {m.role === 'OWNER' ? 'Owner' : 'Member'}
              </span>
              {isOwner && m.role !== 'OWNER' && (
                <button type="button" className="pp-btn pp-btn-danger !px-2 !py-1 text-xs" onClick={() => remove(m.id, m.user.name)}>Remove</button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isOwner ? (
        <div className="pp-panel p-5">
          <h2 className="mb-1 text-sm font-semibold">Add a member</h2>
          <p className="mb-3 text-xs" style={{ color: 'var(--ink-2)' }}>They must already have a Project Pulse account.</p>
          <form onSubmit={add} className="flex flex-col gap-3">
            <ErrorBanner message={error} />
            {notice && <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(45,212,191,.1)', color: 'var(--teal)' }}>{notice}</div>}
            <Field label="Registered email">
              <div className="flex gap-2">
                <input type="email" className="pp-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@example.com" required />
                <button type="submit" className="pp-btn pp-btn-primary shrink-0" disabled={busy}>{busy ? 'Adding…' : 'Add'}</button>
              </div>
            </Field>
          </form>
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>Only the project owner can add or remove members.</p>
      )}
    </div>
  );
}
