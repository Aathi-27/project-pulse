'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import { ErrorBanner, Spinner } from './ui';

interface Member { id: string; role: string; user: { id: string; name: string; email: string } }
export interface ProjectInfo {
  id: string; name: string; description: string; role: string; members: Member[];
}

export function ProjectShell({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    api<ProjectInfo>(`/api/projects/${projectId}`)
      .then(setProject)
      .catch((e) => setError(e.message));
  }, [projectId]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorBanner message={error} />
        <Link href="/projects" className="text-sm" style={{ color: 'var(--teal)' }}>← Back to my projects</Link>
      </div>
    );
  }
  if (!project) return <Spinner label="Loading project" />;

  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: 'Board', exact: true },
    { href: `${base}/dashboard`, label: 'Dashboard', exact: false },
    { href: `${base}/members`, label: 'Members', exact: false },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <Link href="/projects" className="text-xs" style={{ color: 'var(--ink-3)' }}>← My projects</Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold">{project.name}</h1>
          <nav className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--panel)' }}>
            {tabs.map((t) => {
              const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
              return (
                <Link key={t.href} href={t.href}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold"
                  style={active ? { background: 'var(--panel-2)', color: 'var(--teal)' } : { color: 'var(--ink-2)' }}>
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
        {project.description && <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>{project.description}</p>}
      </div>
      <ProjectContext.Provider value={{ project, refresh: () => {
        api<ProjectInfo>(`/api/projects/${projectId}`).then(setProject).catch(() => {});
      }, leaveIfDeleted: () => router.replace('/projects') }}>
        {children}
      </ProjectContext.Provider>
    </div>
  );
}

export const ProjectContext = React.createContext<{
  project: ProjectInfo;
  refresh: () => void;
  leaveIfDeleted: () => void;
} | null>(null);

export function useProject() {
  const ctx = React.useContext(ProjectContext);
  if (!ctx) throw new Error('useProject outside ProjectShell');
  return ctx;
}
