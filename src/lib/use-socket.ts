'use client';
// One Socket.IO connection per project page. Joins the project room after the
// server verifies membership; emits nothing itself, only listens.
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useProjectSocket(projectId: string, onEvent: (event: string, payload: unknown) => void) {
  const socketRef = useRef<Socket | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const socket = io({ path: '/socket.io', withCredentials: true });
    socketRef.current = socket;
    const events = [
      'task:created', 'task:updated', 'task:deleted',
      'comment:added', 'member:added', 'member:removed',
      'project:updated', 'project:deleted',
    ];
    socket.on('connect', () => socket.emit('project:join', projectId));
    socket.on('project:access-revoked', (payload: { projectId: string }) => {
      if (payload.projectId === projectId) window.location.replace('/projects');
    });
    for (const ev of events) socket.on(ev, (payload) => handlerRef.current(ev, payload));
    return () => {
      socket.emit('project:leave', projectId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  return socketRef;
}
