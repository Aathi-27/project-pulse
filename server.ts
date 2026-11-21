/**
 * Custom server: Next.js + Socket.IO on one HTTP server.
 * Socket.IO powers real-time collaboration (module 5). The io instance is
 * exposed on globalThis so API route handlers can broadcast after writes.
 */
import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { verifySessionToken } from './src/lib/session';

const prod = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev: !prod });
const handle = app.getRequestHandler();

declare global {
  // eslint-disable-next-line no-var
  var __io: SocketIOServer | undefined;
}

async function main() {
  await app.prepare();
  const server = createServer((req, res) => handle(req, res));
  const io = new SocketIOServer(server, { path: '/socket.io' });
  globalThis.__io = io;

  const prisma = new PrismaClient();

  io.use(async (socket, nextMw) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const match = cookieHeader.match(/(?:^|;\s*)pp_session=([^;]+)/);
      if (!match) return nextMw(new Error('unauthorized'));
      const session = await verifySessionToken(decodeURIComponent(match[1]));
      if (!session) return nextMw(new Error('unauthorized'));
      socket.data.userId = session.userId;
      nextMw();
    } catch {
      nextMw(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    // Client asks to join a project room; membership is verified server-side.
    socket.on('project:join', async (projectId: string, ack?: (ok: boolean) => void) => {
      try {
        const member = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: socket.data.userId } },
        });
        if (member) {
          socket.join(`project:${projectId}`);
          ack?.(true);
        } else {
          ack?.(false);
        }
      } catch {
        ack?.(false);
      }
    });
    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });
  });

  server.listen(port, () => {
    console.log(`Project Pulse listening on http://localhost:${port} (${prod ? 'production' : 'development'})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
