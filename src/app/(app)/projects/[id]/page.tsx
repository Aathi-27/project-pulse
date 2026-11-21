import { Board } from '@/components/board';

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Board projectId={id} />;
}
