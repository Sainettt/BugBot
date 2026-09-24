import { PublicPlaceholder } from '@/components/PublicPlaceholder';

export default async function IdeasFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicPlaceholder slug={slug} titleKey="public.ideas.title" />;
}
