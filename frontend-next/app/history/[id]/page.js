import GenerationDetailClient from "@/components/history/GenerationDetailClient";

export const metadata = {
  title: "Detail History | VibePlan AI",
};

export default async function HistoryDetailPage({ params }) {
  const resolvedParams = await params;

  return <GenerationDetailClient id={resolvedParams.id} mode="history" />;
}
