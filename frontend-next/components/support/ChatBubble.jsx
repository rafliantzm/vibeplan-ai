"use client";

export default function ChatBubble({
  message,
  senderName,
  createdAt,
  isOwnMessage = false,
  showSenderName = true,
}) {
  const safeMessage = typeof message === "string" ? message : String(message || "");

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "w-fit max-w-[86%] min-w-[96px] overflow-hidden rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] sm:min-w-[120px]",
          isOwnMessage
            ? "rounded-br-md bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8,_#4338ca)] text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800",
        ].join(" ")}
      >
        {!isOwnMessage && showSenderName && senderName ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
            {senderName}
          </p>
        ) : null}
        <p className={`${!isOwnMessage && showSenderName && senderName ? "mt-1" : ""} overflow-hidden whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]`}>
          {safeMessage}
        </p>
        <p className={`mt-2 text-[11px] ${isOwnMessage ? "text-sky-100" : "text-slate-400"}`}>
          {formatBubbleTime(createdAt)}
        </p>
      </div>
    </div>
  );
}

function formatBubbleTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
