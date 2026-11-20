import { ReviewDetailMobile } from '@/features/prototype/ReviewScreens';

export default async function DeskReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReviewDetailMobile reviewId={id} />;
}
