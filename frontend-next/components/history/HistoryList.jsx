import HistoryCard from "@/components/history/HistoryCard";

export default function HistoryList({ items = [], onDeleted }) {
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <HistoryCard key={item.id || item._id} item={item} onDeleted={onDeleted} />
      ))}
    </div>
  );
}
