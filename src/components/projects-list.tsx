'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { EmptyState, ErrorBanner, Field, Modal, Spinner } from './ui';

interface ProjectCard {
  id: string; name: string; description: string; role: string;
  memberCount: number; taskCount: number; doneCount: number; completion: number;
}

interface Overview {
  totalProjects: number; totalTasks: number; completed: number; completionPct: number; overdue: number;
  byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
}

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectCard[] | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    api<ProjectCard[]>('/api/projects').then(setProjects).catch((e) => setError(e.message));
    api<Overview>('/api/stats').then(setOverview).catch(() => {});
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!projects) return <Spinner label="Loading projects" />;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My projects</h1>
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Projects you own or collaborate on.</p>
        </div>
        <button type="button" className="pp-btn pp-btn-primary" onClick={() => setShowNew(true)}>+ New project</button>
      </div>
      {overview && projects.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Projects" value={String(overview.totalProjects)} />
          <StatCard label="Tasks" value={String(overview.totalTasks)} detail={`${overview.byStatus.TODO} to do · ${overview.byStatus.IN_PROGRESS} in progress`} />
          <StatCard label="Completed" value={`${overview.completionPct}%`} detail={`${overview.completed} of ${overview.totalTasks} tasks done`} />
          <StatCard label="Overdue" value={String(overview.overdue)} tone={overview.overdue > 0 ? 'bad' : undefined} />
        </div>
      )}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          detail="Create your first project to start organizing tasks with your team."
          action={<button type="button" className="pp-btn pp-btn-primary" onClick={() => setShowNew(true)}>Create a project</button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="pp-panel pp-card-hover block p-5 transition-colors">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="truncate font-semibold">{p.name}</div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ background: 'var(--panel-2)', color: p.role === 'OWNER' ? 'var(--teal)' : 'var(--ink-2)' }}>
                  {p.role === 'OWNER' ? 'Owner' : 'Member'}
                </span>
              </div>
              {p.description && <div className="mb-3 line-clamp-2 text-sm" style={{ color: 'var(--ink-2)' }}>{p.description}</div>}
              <div className="mb-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--panel-2)' }}>
                <div className="h-full rounded-full" style={{ width: `${p.completion}%`, background: 'var(--teal)' }} />
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                {p.taskCount} task{p.taskCount === 1 ? '' : 's'} · {p.doneCount} done · {p.memberCount} member{p.memberCount === 1 ? '' : 's'}
              </div>
            </Link>
          ))}
        </div>
      )}
      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onCreated={(p) => { window.location.href = `/projects/${p.id}`; }} />}
    </div>
  );
}

function StatCard({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: 'bad' }) {
  return (
    <div className="pp-panel p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-3)' }}>{label}</div>
      <div className="mt-1 text-2xl font-bold" style={tone === 'bad' ? { color: 'var(--red)' } : undefined}>{value}</div>
      {detail && <div className="mt-0.5 text-xs" style={{ color: 'var(--ink-2)' }}>{detail}</div>}
    </div>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: { id: string }) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Project name is required.');
    setBusy(true);
    try {
      const project = await api<{ id: string }>('/api/projects', { method: 'POST', body: { name: name.trim(), description: description.trim() } });
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the project.');
      setBusy(false);
    }
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Field label="Project name">
          <input className="pp-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Product Launch" autoFocus required />
        </Field>
        <Field label="Description (optional)">
          <textarea className="pp-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this project about?" />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="pp-btn pp-btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create project'}</button>
        </div>
      </form>
    </Modal>
  );
}
