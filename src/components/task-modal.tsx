'use client';
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import { useProject } from './project-shell';
import { Avatar, ErrorBanner, Field, Modal, Spinner } from './ui';
import { formatDateTime } from '@/lib/format';
import type { TaskDto } from './board';

interface CommentDto { id: string; text: string; author?: { id: string; name: string }; createdAt: string }
interface ActivityDto { id: string; type: string; detail: string; actor?: { id: string; name: string }; createdAt: string }

export function TaskModal({ projectId, taskId, onClose, onChanged, onDeleted, onCreated }: {
  projectId: string;
  taskId: string | null; // null = create mode
  onClose: () => void;
  onChanged?: (t: TaskDto) => void;
  onDeleted?: (id: string) => void;
  onCreated?: (t: TaskDto) => void;
}) {
  const { project } = useProject();
  const creating = taskId === null;
  const [task, setTask] = useState<TaskDto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TODO');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState<CommentDto[] | null>(null);
  const [activities, setActivities] = useState<ActivityDto[] | null>(null);
  const [commentText, setCommentText] = useState('');
  const [tab, setTab] = useState<'comments' | 'activity'>('comments');

  useEffect(() => {
    if (creating) return;
    let cancelled = false;
    (async () => {
      try {
        const tasks = await api<TaskDto[]>(`/api/projects/${projectId}/tasks`);
        const t = tasks.find((x) => x.id === taskId);
        if (!t || cancelled) return;
        setTask(t);
        setTitle(t.title); setDescription(t.description); setPriority(t.priority); setStatus(t.status);
        setAssigneeId(t.assigneeId ?? ''); setDueDate(t.dueDate ? t.dueDate.slice(0, 10) : '');
        const [cs, as] = await Promise.all([
          api<CommentDto[]>(`/api/projects/${projectId}/tasks/${taskId}/comments`),
          api<ActivityDto[]>(`/api/projects/${projectId}/activities?taskId=${taskId}`),
        ]);
        if (!cancelled) { setComments(cs); setActivities(as); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the task.');
      }
    })();
    return () => { cancelled = true; };
  }, [creating, projectId, taskId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Task title is required.');
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null,
      };
      if (creating) {
        const t = await api<TaskDto>(`/api/projects/${projectId}/tasks`, { method: 'POST', body });
        onCreated?.(t);
      } else {
        const t = await api<TaskDto>(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'PATCH', body });
        setTask(t);
        onChanged?.(t);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the task.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/tasks/${task.id}`, { method: 'DELETE' });
      onDeleted?.(task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the task.');
      setBusy(false);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const c = await api<CommentDto>(`/api/projects/${projectId}/tasks/${taskId}/comments`, { method: 'POST', body: { text: commentText.trim() } });
      setComments((cur) => [...(cur ?? []), c]);
      setCommentText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the comment.');
    }
  }

  return (
    <Modal title={creating ? 'New task' : 'Task details'} onClose={onClose} wide>
      {!creating && !task ? (
        error ? <ErrorBanner message={error} /> : <Spinner label="Loading task" />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          {/* Left: fields */}
          <form onSubmit={save} className="flex flex-col gap-4 md:col-span-3">
            <ErrorBanner message={error} />
            <Field label="Title">
              <input className="pp-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short task name" autoFocus={creating} required />
            </Field>
            <Field label="Description">
              <textarea className="pp-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details, links, acceptance criteria…" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!creating && (
                <Field label="Status">
                  <select className="pp-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </Field>
              )}
              <Field label="Priority">
                <select className="pp-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </Field>
              <Field label="Assignee">
                <select className="pp-input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {project.members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
                </select>
              </Field>
              <Field label="Due date">
                <input type="date" className="pp-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
            {task && (
              <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
                Created {formatDateTime(task.createdAt)} · Updated {formatDateTime(task.updatedAt)}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              {!creating && (
                <button type="button" className="pp-btn pp-btn-danger" onClick={remove} disabled={busy}>Delete</button>
              )}
              <div className="ml-auto flex gap-2">
                <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="pp-btn pp-btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : creating ? 'Create task' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
          {/* Right: comments + activity */}
          {!creating && (
            <div className="md:col-span-2">
              <div className="mb-3 flex gap-1 rounded-lg p-1" style={{ background: 'var(--panel-2)' }}>
                {(['comments', 'activity'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className="flex-1 rounded-md px-2 py-1 text-xs font-semibold capitalize"
                    style={tab === t ? { background: 'var(--panel)', color: 'var(--teal)' } : { color: 'var(--ink-2)' }}>
                    {t === 'comments' ? `Comments (${comments?.length ?? '…'})` : 'Activity'}
                  </button>
                ))}
              </div>
              {tab === 'comments' ? (
                <div className="flex flex-col gap-3">
                  {!comments ? <Spinner /> : comments.length === 0 ? (
                    <div className="py-6 text-center text-xs" style={{ color: 'var(--ink-3)' }}>No comments yet. Start the discussion.</div>
                  ) : (
                    <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-2">
                          <Avatar name={c.author?.name ?? '?'} size={24} />
                          <div className="min-w-0">
                            <div className="text-xs" style={{ color: 'var(--ink-2)' }}>
                              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{c.author?.name}</span> · {formatDateTime(c.createdAt)}
                            </div>
                            <div className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={addComment} className="flex gap-2">
                    <input className="pp-input" placeholder="Write a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                    <button type="submit" className="pp-btn pp-btn-primary !px-3" disabled={!commentText.trim()}>Send</button>
                  </form>
                </div>
              ) : (
                !activities ? <Spinner /> : activities.length === 0 ? (
                  <div className="py-6 text-center text-xs" style={{ color: 'var(--ink-3)' }}>No activity recorded yet.</div>
                ) : (
                  <div className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                    {activities.map((a) => (
                      <div key={a.id} className="border-l-2 pl-3 text-xs" style={{ borderColor: 'var(--border)' }}>
                        <div style={{ color: 'var(--ink-2)' }}>
                          <span className="font-semibold" style={{ color: 'var(--ink)' }}>{a.actor?.name}</span> {a.detail}
                        </div>
                        <div style={{ color: 'var(--ink-3)' }}>{formatDateTime(a.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
