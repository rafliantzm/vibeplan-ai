import GenerationDetailClient from "@/components/history/GenerationDetailClient";

export const metadata = {
  title: "Result | VibePlan AI",
};

export default async function ResultPage({ params }) {
  const resolvedParams = await params;

  return <GenerationDetailClient id={resolvedParams.id} mode="result" />;
}
