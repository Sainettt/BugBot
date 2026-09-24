import { PublicPlaceholder } from '@/components/PublicPlaceholder';

/** The handoff landing page (plan 02): the API verifies the token and sets the `psid` cookie. */
export default async function CallbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicPlaceholder slug={slug} titleKey="public.callback.title" />;
}
