import AdminSupportConversationDetailClient from "@/components/admin/AdminSupportConversationDetailClient";

export default async function Page({ params }) {
  const { id } = await params;

  return <AdminSupportConversationDetailClient conversationId={id} />;
}
