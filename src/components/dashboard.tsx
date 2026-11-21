'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { api } from '@/lib/client-api';
import { useProjectSocket } from '@/lib/use-socket';
import { ErrorBanner, Spinner, EmptyState } from './ui';

interface Stats {
  totalTasks: number;
  byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
  byPriority: { LOW: number; MEDIUM: number; HIGH: number };
  completed: number;
  completionPct: number;
  overdue: number;
  perMember: { userId: string; name: string; assigned: number; done: number }[];
}

const STATUS_COLORS = { 'To Do': '#64748b', 'In Progress': '#fbbf24', 'Done': '#2dd4bf' };

export function Dashboard({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Stats>(`/api/projects/${projectId}/dashboard`).then(setStats).catch((e) => setError(e.message));
  }, [projectId]);

  useEffect(load, [load]);

  // Live: any task change refreshes the numbers without a page reload.
  const onSocketEvent = useCallback((event: string) => {
    if (event.startsWith('task:')) load();
  }, [load]);
  useProjectSocket(projectId, onSocketEvent);

  if (error) return <ErrorBanner message={error} />;
  if (!stats) return <Spinner label="Loading dashboard" />;
  if (stats.totalTasks === 0) {
    return <EmptyState title="Nothing to report yet" detail="The dashboard fills in as soon as the project has tasks." />;
  }

  const statusData = [
    { name: 'To Do', value: stats.byStatus.TODO },
    { name: 'In Progress', value: stats.byStatus.IN_PROGRESS },
    { name: 'Done', value: stats.byStatus.DONE },
  ];
  const priorityData = [
    { name: 'High', value: stats.byPriority.HIGH },
    { name: 'Medium', value: stats.byPriority.MEDIUM },
    { name: 'Low', value: stats.byPriority.LOW },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total tasks" value={stats.totalTasks} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Overdue" value={stats.overdue} alert={stats.overdue > 0} />
        <StatCard label="Completion" value={`${stats.completionPct}%`} />
      </div>

      <div className="pp-panel p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">Overall progress</span>
          <span style={{ color: 'var(--ink-2)' }}>{stats.completed} of {stats.totalTasks} tasks done</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--panel-2)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${stats.completionPct}%`, background: 'var(--teal)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="pp-panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Tasks by status</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3} isAnimationActive={false}>
                  {statusData.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name as keyof typeof STATUS_COLORS]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#171b25', border: '1px solid #232837', borderRadius: 8, color: '#e6e9f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="pp-panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Tasks by priority</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={priorityData}>
                <CartesianGrid stroke="#232837" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9aa3b2', fontSize: 12 }} axisLine={{ stroke: '#232837' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#9aa3b2', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#171b25', border: '1px solid #232837', borderRadius: 8, color: '#e6e9f0' }} />
                <Bar dataKey="value" name="Tasks" fill="#2dd4bf" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="pp-panel p-5">
        <h2 className="mb-3 text-sm font-semibold">Team workload</h2>
        {stats.perMember.length === 0 ? (
          <div className="text-sm" style={{ color: 'var(--ink-3)' }}>No members yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {stats.perMember.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate font-medium">{m.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--panel-2)' }}>
                  <div className="h-full rounded-full" style={{
                    width: `${m.assigned === 0 ? 0 : Math.round((m.done / m.assigned) * 100)}%`,
                    background: 'var(--teal)',
                  }} />
                </div>
                <span className="w-24 text-right text-xs" style={{ color: 'var(--ink-2)' }}>{m.done}/{m.assigned} done</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, alert }: { label: string; value: number | string; alert?: boolean }) {
  return (
    <div className="pp-panel p-4">
      <div className="text-2xl font-bold" style={alert ? { color: 'var(--red)' } : {}}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--ink-2)' }}>{label}</div>
    </div>
  );
}
