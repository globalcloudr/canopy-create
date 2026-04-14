import { AppSurface } from "@canopy/ui";

import ClientShell from "@/app/_components/client-shell";

type ItemDetailPageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { itemId } = await params;

  return (
    <ClientShell activeNav="requests">
      <AppSurface className="px-6 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#0f172a]">
          Item Detail
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-[#617286]">
          Canopy Create item detail scaffold for <code>{itemId}</code>.
        </p>
      </AppSurface>
    </ClientShell>
  );
}
