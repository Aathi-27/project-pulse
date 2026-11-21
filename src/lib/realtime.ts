// Broadcast helper: API routes call this after a successful write so every
// other member of the project sees the change without refreshing (module 5).
import type { Server as SocketIOServer } from 'socket.io';

declare global {
  var __io: SocketIOServer | undefined;
}

export function broadcast(projectId: string, event: string, payload: unknown) {
  const io = globalThis.__io;
  if (!io) return; // tests run without a socket server
  io.to(`project:${projectId}`).emit(event, payload);
}

/** Revoke live subscriptions on every open tab when membership is removed. */
export function removeUserFromProjectRoom(projectId: string, userId: string) {
  const io = globalThis.__io;
  if (!io) return;
  io.to(`user:${userId}`).emit('project:access-revoked', { projectId });
  io.in(`user:${userId}`).socketsLeave(`project:${projectId}`);
}
