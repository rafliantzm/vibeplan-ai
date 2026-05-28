"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import {
  adminCloseSupportConversation,
  adminGetSupportConversation,
  adminReopenSupportConversation,
  adminSendSupportConversationMessage,
} from "@/lib/api";
import { getUser, subscribeAuthChange } from "@/lib/auth";
import { formatDate, getErrorMessage } from "@/lib/utils";

export default function AdminSupportConversationDetailClient({ conversationId }) {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const messageListRef = useRef(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
      setUser(getUser());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    function syncUser() {
      setUser(getUser());
    }

    const unsubscribe = subscribeAuthChange(syncUser);

    return unsubscribe;
  }, [isMounted]);

  const loadConversation = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }

      const payload = await adminGetSupportConversation(conversationId);
      setConversation(payload?.data?.conversation || null);
      setMessages(payload?.data?.messages || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    if (!isMounted || !isAdmin || !conversationId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadConversation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [conversationId, isAdmin, isMounted, loadConversation]);

  useEffect(() => {
    if (!isMounted || !isAdmin || !conversationId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadConversation({ silent: true });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [conversationId, isAdmin, isMounted, loadConversation]);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages]);

  async function handleReplySubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      setNotice("");
      const payload = await adminSendSupportConversationMessage(conversationId, {
        message: reply,
      });
      setConversation(payload?.data?.conversation || null);
      setMessages(payload?.data?.messages || []);
      setReply("");
      setNotice(payload?.message || "Pesan admin berhasil dikirim.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClose() {
    try {
      setIsClosing(true);
      setError("");
      setNotice("");
      const payload = await adminCloseSupportConversation(conversationId);
      setConversation(payload?.data?.conversation || null);
      setMessages(payload?.data?.messages || []);
      setNotice(payload?.message || "Percakapan berhasil ditutup.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsClosing(false);
    }
  }

  async function handleReopen() {
    try {
      setIsReopening(true);
      setError("");
      setNotice("");
      const payload = await adminReopenSupportConversation(conversationId);
      setConversation(payload?.data?.conversation || null);
      setMessages(payload?.data?.messages || []);
      setNotice(payload?.message || "Percakapan berhasil dibuka kembali.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsReopening(false);
    }
  }

  if (!isMounted) {
    return (
      <LoadingState
        title="Memeriksa sesi admin..."
        description="Mohon tunggu, status autentikasi sedang disiapkan."
      />
    );
  }

  if (!isAdmin) {
    return (
      <LoginRequiredCard
        title="Akses Admin Diperlukan"
        message="Silakan login dengan akun admin untuk membuka detail live chat support."
        actionLabel={user ? "Kembali ke Home" : "Login Admin"}
        onAction={() => {
          window.location.href = user ? "/" : `/login?redirect=/admin/support-conversations/${conversationId || ""}`;
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Memuat percakapan..."
        description="Detail live chat support sedang diambil dari backend Laravel."
      />
    );
  }

  if (error && !conversation) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          Live Chat Support
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Percakapan bantuan langsung
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Balas percakapan bantuan dari user dan guest secara langsung.
        </p>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
          {notice}
        </div>
      ) : null}

      {conversation ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-6">
            <div>
              <p className="text-2xl font-semibold text-slate-900">{conversation.name}</p>
              <p className="mt-2 text-sm text-slate-500">{conversation.email}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                Terakhir aktif {formatDate(conversation.last_message_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={conversation.status} />
              {conversation.unread_for_admin > 0 ? (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  {conversation.unread_for_admin} unread
                </span>
              ) : null}
            </div>
          </div>

          <div
            ref={messageListRef}
            className="max-h-[55vh] min-h-[340px] space-y-4 overflow-y-auto bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-5 py-5"
          >
            {messages.map((item) => (
              <ChatBubble key={item.id} item={item} />
            ))}
          </div>

          <div className="border-t border-slate-100 px-5 py-5">
            {conversation.status === "closed" ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Percakapan ini sudah ditutup.
                </div>
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={isReopening}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isReopening ? "Membuka..." : "Buka Kembali"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleReplySubmit} className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Balasan Admin</span>
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    required
                    className="resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                    placeholder="Tulis balasan untuk user atau guest..."
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-full bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8,_#4338ca)] px-5 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Mengirim..." : "Kirim Balasan"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isClosing}
                    className="rounded-full border border-rose-200 px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isClosing ? "Menutup..." : "Tutup Percakapan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ChatBubble({ item }) {
  const isAdmin = item.sender_type === "admin";

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] rounded-[1.5rem] px-4 py-3 shadow-sm",
          isAdmin
            ? "rounded-br-md bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8,_#4338ca)] text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800",
        ].join(" ")}
      >
        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isAdmin ? "text-sky-100" : "text-sky-600"}`}>
          {isAdmin ? "Admin" : item.sender_name || "User"}
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-7">{item.message}</p>
        <p className={`mt-2 text-[11px] ${isAdmin ? "text-sky-100" : "text-slate-400"}`}>
          {formatChatTime(item.created_at)}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    open: "border-slate-200 bg-slate-100 text-slate-700",
    waiting_admin: "border-amber-200 bg-amber-50 text-amber-700",
    waiting_user: "border-sky-200 bg-sky-50 text-sky-700",
    closed: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${classes[status] || classes.open}`}>
      {String(status || "open").replace("_", " ")}
    </span>
  );
}

function formatChatTime(value) {
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
