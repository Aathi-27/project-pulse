import { Members } from '@/components/members';

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Members projectId={id} />;
}
