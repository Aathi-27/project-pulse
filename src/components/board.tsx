'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/client-api';
import { useProjectSocket } from '@/lib/use-socket';
import { useProject } from './project-shell';
import { Avatar, EmptyState, ErrorBanner, PriorityPill, Spinner } from './ui';
import { TaskModal } from './task-modal';
import { formatDate, isOverdue } from '@/lib/format';

export interface TaskDto {
  id: string; projectId: string; title: string; description: string;
  status: string; priority: string; position: number;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string } | null;
  dueDate: string | null;
  createdById: string;
  createdAt: string; updatedAt: string;
}

const COLUMNS = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'DONE', label: 'Done' },
] as const;

export function Board({ projectId }: { projectId: string }) {
  const { project, leaveIfDeleted } = useProject();
  const [tasks, setTasks] = useState<TaskDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [mobileCol, setMobileCol] = useState<string>('TODO');

  useEffect(() => {
    api<TaskDto[]>(`/api/projects/${projectId}/tasks`).then(setTasks).catch((e) => setError(e.message));
  }, [projectId]);

  const onSocketEvent = useCallback((event: string, payload: unknown) => {
    if (event === 'project:deleted') return leaveIfDeleted();
    setTasks((prev) => {
      if (!prev) return prev;
      if (event === 'task:created') {
        const t = payload as TaskDto;
        return prev.some((x) => x.id === t.id) ? prev : [...prev, t];
      }
      if (event === 'task:updated') {
        const t = payload as TaskDto;
        return prev.map((x) => (x.id === t.id ? t : x));
      }
      if (event === 'task:deleted') {
        const { id } = payload as { id: string };
        return prev.filter((x) => x.id !== id);
      }
      return prev;
    });
  }, [leaveIfDeleted]);

  const socketRef = useProjectSocket(projectId, onSocketEvent);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const on = () => setLive(true);
    const off = () => setLive(false);
    socket.on('connect', on);
    socket.on('disconnect', off);
    if (socket.connected) setLive(true);
    return () => { socket.off('connect', on); socket.off('disconnect', off); };
  }, [socketRef, projectId]);

  // PointerSensor covers mouse; TouchSensor (press-and-hold, then drag) covers touch
  // screens without blocking normal page scroll.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const filtered = useMemo(() => {
    if (!tasks) return [];
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter]);

  const byStatus = useMemo(() => {
    const map: Record<string, TaskDto[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const t of filtered) (map[t.status] ??= []).push(t);
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.position - b.position);
    return map;
  }, [filtered]);

  function onDragStart(e: DragStartEvent) {
    setActiveTaskId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveTaskId(null);
    const { active, over } = e;
    if (!over || !tasks) return;
    const taskId = String(active.id);
    const moving = tasks.find((t) => t.id === taskId);
    if (!moving) return;

    // Over may be a task card or a column body.
    const overId = String(over.id);
    const overTask = tasks.find((t) => t.id === overId);
    const targetStatus = overTask ? overTask.status : (COLUMNS.some((c) => c.status === overId) ? overId : moving.status);

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    let index = columnTasks.length;
    if (overTask && overTask.id !== taskId) {
      const overIndex = columnTasks.findIndex((t) => t.id === overTask.id);
      if (overIndex >= 0) {
        const rect = over.rect;
        const activeTop = e.active.rect.current.translated?.top ?? 0;
        const below = activeTop > rect.top + rect.height / 2;
        index = below ? overIndex + 1 : overIndex;
      }
    }

    const prev = columnTasks[index - 1];
    const next = columnTasks[index];
    const position = prev && next ? (prev.position + next.position) / 2
      : prev ? prev.position + 1024
      : next ? next.position - 1024
      : 1024;

    // Optimistic update, rollback on failure.
    const snapshot = tasks;
    const optimistic = tasks.map((t) => (t.id === taskId ? { ...t, status: targetStatus, position } : t));
    setTasks(optimistic);
    try {
      const saved = await api<TaskDto>(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status: targetStatus, position },
      });
      setTasks((cur) => (cur ?? []).map((t) => (t.id === taskId ? saved : t)));
    } catch (err) {
      setTasks(snapshot);
      setError(err instanceof Error ? err.message : 'Could not move the task.');
    }
  }

  if (error && !tasks) return <ErrorBanner message={error} />;
  if (!tasks) return <Spinner label="Loading board" />;

  const activeTask = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : null;
  const filtering = Boolean(search.trim() || statusFilter || priorityFilter || assigneeFilter);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="pp-input !w-auto min-w-40 flex-1 sm:flex-none"
          placeholder="Search tasks by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search tasks"
        />
        <select className="pp-input !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
        <select className="pp-input !w-auto" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} aria-label="Filter by priority">
          <option value="">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select className="pp-input !w-auto" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="Filter by assignee">
          <option value="">All members</option>
          {project.members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
        </select>
        {filtering && (
          <button type="button" className="pp-btn pp-btn-ghost !py-1.5 text-xs" onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setAssigneeFilter(''); }}>
            Clear filters
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: live ? 'var(--teal)' : 'var(--ink-3)' }} title={live ? 'Live: changes from teammates appear instantly' : 'Connecting…'}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: live ? 'var(--teal)' : 'var(--ink-3)' }} />
            {live ? 'Live' : 'Connecting'}
          </span>
          <AddTaskButton projectId={projectId} onCreated={(t) => setTasks((cur) => (cur && !cur.some((x) => x.id === t.id) ? [...cur, t] : cur))} />
        </div>
      </div>
      {error && <div className="mb-3"><ErrorBanner message={error} /></div>}

      {tasks.length === 0 ? (
        <EmptyState title="No tasks yet" detail="Create the first task to get this project moving." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No tasks match your filters" detail="Try a different search or clear the filters." />
      ) : (
        <>
          {/* Mobile column switcher */}
          <div className="mb-3 flex gap-1 rounded-lg p-1 sm:hidden" style={{ background: 'var(--panel)' }}>
            {COLUMNS.map((c) => (
              <button key={c.status} type="button" onClick={() => setMobileCol(c.status)}
                className="flex-1 rounded-md px-2 py-1.5 text-xs font-semibold"
                style={mobileCol === c.status ? { background: 'var(--panel-2)', color: 'var(--teal)' } : { color: 'var(--ink-2)' }}>
                {c.label} ({byStatus[c.status]?.length ?? 0})
              </button>
            ))}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {COLUMNS.map((c) => (
                <div key={c.status} className={mobileCol === c.status ? '' : 'hidden sm:block'}>
                  <Column
                    status={c.status}
                    label={c.label}
                    tasks={byStatus[c.status] ?? []}
                    onOpen={(id) => setOpenTaskId(id)}
                  />
                </div>
              ))}
            </div>
            <DragOverlay>{activeTask ? <TaskCard task={activeTask} overlay /> : null}</DragOverlay>
          </DndContext>
        </>
      )}
      {openTaskId && (
        <TaskModal
          projectId={projectId}
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onChanged={(t) => setTasks((cur) => (cur ?? []).map((x) => (x.id === t.id ? t : x)))}
          onDeleted={(id) => { setTasks((cur) => (cur ?? []).filter((x) => x.id !== id)); setOpenTaskId(null); }}
        />
      )}
    </div>
  );
}

function Column({ status, label, tasks, onOpen }: { status: string; label: string; tasks: TaskDto[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className="flex min-h-40 flex-col gap-2 rounded-xl p-3 transition-colors"
      style={{ background: isOver ? 'var(--panel-2)' : 'var(--panel)', border: '1px solid var(--border)' }}
      aria-label={`${label} column`}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--panel-2)', color: 'var(--ink-2)' }}>{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {tasks.map((t) => <SortableTaskCard key={t.id} task={t} onOpen={onOpen} />)}
        </div>
      </SortableContext>
      {tasks.length === 0 && <div className="px-1 py-4 text-center text-xs" style={{ color: 'var(--ink-3)' }}>Drop tasks here</div>}
    </section>
  );
}

function SortableTaskCard({ task, onOpen }: { task: TaskDto; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <TaskCard task={task} dragHandleProps={{ ...attributes, ...listeners }} onOpen={onOpen} />
    </div>
  );
}

function TaskCard({ task, overlay, dragHandleProps, onOpen }: {
  task: TaskDto; overlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onOpen?: (id: string) => void;
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <div
      className="pp-panel pp-card-hover cursor-pointer p-3"
      style={overlay ? { boxShadow: '0 8px 24px rgba(0,0,0,.5)', borderColor: 'var(--teal)' } : {}}
      onClick={() => onOpen?.(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen?.(task.id); }}
    >
      <div className="flex items-start justify-between gap-2" {...dragHandleProps}>
        <div className="text-sm font-medium leading-snug">{task.title}</div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <PriorityPill priority={task.priority} />
        {task.dueDate && (
          <span className="text-[11px]" style={{ color: overdue ? 'var(--red)' : 'var(--ink-3)' }}>
            {overdue ? 'Overdue · ' : ''}{formatDate(task.dueDate)}
          </span>
        )}
        <span className="ml-auto">{task.assignee ? <Avatar name={task.assignee.name} size={22} /> : null}</span>
      </div>
    </div>
  );
}

function AddTaskButton({ projectId, onCreated }: { projectId: string; onCreated: (t: TaskDto) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="pp-btn pp-btn-primary" onClick={() => setOpen(true)}>+ Add task</button>
      {open && <TaskModal projectId={projectId} taskId={null} onClose={() => setOpen(false)} onCreated={(t) => { onCreated(t); setOpen(false); }} />}
    </>
  );
}
