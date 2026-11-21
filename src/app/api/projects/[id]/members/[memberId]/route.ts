import { requireUser } from '@/lib/auth';
import { removeMember } from '@/lib/services/projects';
import { ok, fail } from '@/lib/http';
import { broadcast, removeUserFromProjectRoom } from '@/lib/realtime';

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, memberId } = await ctx.params;
    const member = await removeMember(id, user.id, memberId);
    // Revoke existing subscriptions before broadcasting or returning success.
    removeUserFromProjectRoom(id, member.userId);
    broadcast(id, 'member:removed', { id: memberId, userId: member.userId });
    return ok({ removed: true });
  } catch (err) {
    return fail(err);
  }
}
