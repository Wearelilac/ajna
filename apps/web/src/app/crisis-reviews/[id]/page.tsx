import { redirect } from 'next/navigation';

export default async function CrisisDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/desk/reviews/${id}`);
}
