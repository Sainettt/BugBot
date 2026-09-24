import { PublicPlaceholder } from '@/components/PublicPlaceholder';

export default async function AlarmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicPlaceholder slug={slug} titleKey="public.alarm.title" />;
}
