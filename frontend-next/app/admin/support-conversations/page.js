"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import ChatBubble from "@/components/support/ChatBubble";
import {
  adminCloseSupportConversation,
  adminGetSupportConversation,
  adminGetSupportConversations,
  adminReopenSupportConversation,
  adminSendSupportConversationMessage,
  deleteSupportConversation,
  deleteSupportMessage,
} from "@/lib/api";
import { getUser, subscribeAuthChange } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

const DEFAULT_FILTERS = {
  search: "",
  status: "",
};
const SUPPORT_MESSAGE_LIMIT = 2000;
const ADMIN_SUPPORT_NOTICE_KEY = "vibeplan_admin_support_notice";

export default function AdminSupportConversationsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [isMobileRoomOpen, setIsMobileRoomOpen] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [isDeleteConversationModalOpen, setIsDeleteConversationModalOpen] = useState(false);
  const [messagePendingDelete, setMessagePendingDelete] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const conversationListRef = useRef(null);
  const sidebarScrollTopRef = useRef(0);
  const isUserScrollingSidebarRef = useRef(false);
  const messageListRef = useRef(null);
  const messageBottomRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const selectedConversationIdRef = useRef("");
  const lastMessageIdRef = useRef("");
  const adminJustSentRef = useRef(false);
  const initialConversationLoadRef = useRef(true);
  const isAdmin = user?.role === "admin";

  const preserveSidebarScroll = useCallback(() => {
    const element = conversationListRef.current;

    if (!element) {
      return;
    }

    sidebarScrollTopRef.current = element.scrollTop;
  }, []);

  const restoreSidebarScroll = useCallback(() => {
    window.requestAnimationFrame(() => {
      const element = conversationListRef.current;

      if (!element) {
        return;
      }

      element.scrollTop = sidebarScrollTopRef.current;
    });
  }, []);

  const handleSidebarScroll = useCallback((event) => {
    isUserScrollingSidebarRef.current = true;
    sidebarScrollTopRef.current = event.currentTarget.scrollTop;
  }, []);

  const handleSelectConversation = useCallback((conversationId) => {
    const sidebarScrollTop =
      conversationListRef.current?.scrollTop ?? sidebarScrollTopRef.current ?? 0;

    preserveSidebarScroll();
    setSelectedConversationId(conversationId);
    setIsMobileRoomOpen(true);
    setNotice("");
    setError("");
    window.requestAnimationFrame(() => {
      if (conversationListRef.current) {
        conversationListRef.current.scrollTop = sidebarScrollTop;
      }
    });
  }, [preserveSidebarScroll]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
      setUser(getUser());
      const storedNotice = window.sessionStorage.getItem(ADMIN_SUPPORT_NOTICE_KEY);

      if (storedNotice) {
        setNotice(storedNotice);
        window.sessionStorage.removeItem(ADMIN_SUPPORT_NOTICE_KEY);
      }
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

  const loadConversations = useCallback(async ({ nextFilters = filters, silent = false } = {}) => {
    try {
      if (!silent) {
        setIsLoadingList(true);
      }

      const previousScrollTop = conversationListRef.current?.scrollTop ?? sidebarScrollTopRef.current;
      sidebarScrollTopRef.current = previousScrollTop;

      const payload = await adminGetSupportConversations(nextFilters);
      const nextConversations = normalizeConversationList(payload?.data || []);

      setConversations(nextConversations);
      setSelectedConversationId((current) => {
        if (!nextConversations.length) {
          setIsMobileRoomOpen(false);
          return "";
        }

        if (current && nextConversations.some((item) => item._stableId === current)) {
          return current;
        }

        return nextConversations[0]?._stableId || "";
      });
      restoreSidebarScroll();
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      if (!silent) {
        setIsLoadingList(false);
        setIsApplying(false);
      }
    }
  }, [filters, restoreSidebarScroll]);

  const loadSelectedConversation = useCallback(async ({ silent = false } = {}) => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    try {
      if (!silent) {
        setIsLoadingDetail(true);
      }

      const payload = await adminGetSupportConversation(selectedConversationId);
      const nextConversation = normalizeConversation(payload?.data?.conversation || null);
      const nextMessages = normalizeMessageList(payload?.data?.messages || []);

      setSelectedConversation(nextConversation);
      setMessages(nextMessages);
      setConversations((current) => mergeConversationList(current, nextConversation ? {
        ...nextConversation,
        unread_for_admin: 0,
      } : null));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      if (!silent) {
        setIsLoadingDetail(false);
      }
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!isMounted || !isAdmin) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadConversations({ nextFilters: DEFAULT_FILTERS });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, isMounted, loadConversations]);

  useEffect(() => {
    if (!isMounted || !isAdmin || !selectedConversationId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadSelectedConversation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, isMounted, loadSelectedConversation, selectedConversationId]);

  useEffect(() => {
    if (!isMounted || !isAdmin) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadConversations({ silent: true });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [isAdmin, isMounted, loadConversations]);

  useEffect(() => {
    if (!isMounted || !isAdmin || !selectedConversationId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadSelectedConversation({ silent: true });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [isAdmin, isMounted, loadSelectedConversation, selectedConversationId]);

  useEffect(() => {
    if (selectedConversationIdRef.current === selectedConversationId) {
      return;
    }

    selectedConversationIdRef.current = selectedConversationId;
    lastMessageIdRef.current = "";
    shouldAutoScrollRef.current = true;
    adminJustSentRef.current = false;
    initialConversationLoadRef.current = true;
  }, [selectedConversationId]);

  useEffect(() => {
    const container = messageListRef.current;

    if (!container) {
      return;
    }

    const lastMessageId = messages[messages.length - 1]?._stableId || "";
    const hasNewLastMessage = Boolean(lastMessageId) && lastMessageId !== lastMessageIdRef.current;
    const shouldScroll =
      initialConversationLoadRef.current
      || adminJustSentRef.current
      || (hasNewLastMessage && shouldAutoScrollRef.current);

    if (shouldScroll) {
      window.requestAnimationFrame(() => {
        messageBottomRef.current?.scrollIntoView({
          behavior: initialConversationLoadRef.current ? "auto" : "smooth",
          block: "end",
        });
      });
    }

    initialConversationLoadRef.current = false;
    adminJustSentRef.current = false;
    lastMessageIdRef.current = lastMessageId;
  }, [messages]);

  function handleMessageListScroll() {
    shouldAutoScrollRef.current = isNearBottom(messageListRef.current);
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleApplyFilters(event) {
    event.preventDefault();
    setIsApplying(true);
    await loadConversations({ nextFilters: filters });
  }

  async function handleReplySubmit(event) {
    event.preventDefault();

    if (!selectedConversationId) {
      return;
    }

    if (reply.trim().length > SUPPORT_MESSAGE_LIMIT) {
      setError("Pesan terlalu panjang. Ringkas pesan maksimal 2000 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setNotice("");
      adminJustSentRef.current = true;
      const payload = await adminSendSupportConversationMessage(selectedConversationId, {
        message: reply,
      });
      applyConversationResponse(payload, {
        fallbackNotice: "Pesan admin berhasil dikirim.",
        clearReply: true,
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClose() {
    if (!selectedConversationId) {
      return;
    }

    try {
      setIsClosing(true);
      setError("");
      setNotice("");
      const payload = await adminCloseSupportConversation(selectedConversationId);
      applyConversationResponse(payload, {
        fallbackNotice: "Percakapan berhasil ditutup.",
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsClosing(false);
    }
  }

  async function handleReopen() {
    if (!selectedConversationId) {
      return;
    }

    try {
      setIsReopening(true);
      setError("");
      setNotice("");
      const payload = await adminReopenSupportConversation(selectedConversationId);
      applyConversationResponse(payload, {
        fallbackNotice: "Percakapan berhasil dibuka kembali.",
      });
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsReopening(false);
    }
  }

  async function handleDeleteConversation() {
    if (!selectedConversationId) {
      return;
    }

    try {
      setIsDeletingConversation(true);
      setError("");
      setNotice("");
      await deleteSupportConversation(selectedConversationId);

      const remainingConversations = conversations.filter((item) => item._stableId !== selectedConversationId);
      const nextSelectedId = remainingConversations[0]?._stableId || "";
      const nextConversation =
        nextSelectedId
          ? remainingConversations.find((item) => item._stableId === nextSelectedId) || null
          : null;

      setConversations(remainingConversations);
      setSelectedConversationId(nextSelectedId);
      setSelectedConversation(nextConversation);
      setMessages([]);
      setReply("");
      setNotice("Percakapan berhasil dihapus.");
      setIsDeleteConversationModalOpen(false);
      setIsMobileRoomOpen(Boolean(nextSelectedId));
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsDeletingConversation(false);
    }
  }

  async function handleDeleteMessage() {
    if (!selectedConversationId || !getMessageId(messagePendingDelete)) {
      return;
    }

    try {
      setIsDeletingMessage(true);
      setError("");
      setNotice("");
      const payload = await deleteSupportMessage(selectedConversationId, getMessageId(messagePendingDelete));
      const nextConversation = normalizeConversation(payload?.data?.conversation || null);
      const nextMessages = normalizeMessageList(payload?.data?.messages || []);

      setSelectedConversation(nextConversation);
      setMessages(nextMessages);
      setConversations((current) => mergeConversationList(current, nextConversation));
      setNotice(payload?.message || "Pesan berhasil dihapus.");
      setMessagePendingDelete(null);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsDeletingMessage(false);
    }
  }

  function applyConversationResponse(payload, { fallbackNotice, clearReply = false } = {}) {
    const nextConversation = normalizeConversation(payload?.data?.conversation || null);
    const nextMessages = normalizeMessageList(payload?.data?.messages || []);

    setSelectedConversation(nextConversation);
    setMessages(nextMessages);
    setConversations((current) => mergeConversationList(current, nextConversation));
    setNotice(payload?.message || fallbackNotice || "");

    if (clearReply) {
      setReply("");
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
        message="Silakan login dengan akun admin untuk membuka live chat support."
        actionLabel={user ? "Kembali ke Home" : "Login Admin"}
        onAction={() => {
          window.location.href = user ? "/" : "/login?redirect=/admin/support-conversations";
        }}
      />
    );
  }

  return (
    <div className="grid gap-5">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-white via-sky-50/75 to-indigo-50/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
              Live Chat Support
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Inbox percakapan admin
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Balas pesan guest dan user dari satu ruang chat yang terus diperbarui setiap beberapa detik.
            </p>
          </div>
          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Status Inbox
            </p>
            <div className="mt-4 grid gap-3">
              <SummaryChip label="Total chat" value={`${conversations.length} percakapan`} tone="sky" />
              <SummaryChip
                label="Perlu dibalas"
                value={`${conversations.filter((item) => Number(item.unread_for_admin || 0) > 0 || item.status === "waiting_admin").length} chat aktif`}
                tone="amber"
              />
            </div>
          </div>
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
          {notice}
        </div>
      ) : null}

      <section className="min-h-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 lg:h-[calc(100vh-112px)] lg:min-h-[640px]">
        <div className="grid h-[calc(100vh-140px)] min-h-[560px] min-w-0 overflow-hidden sm:min-h-[640px] lg:h-full lg:grid-cols-[360px_minmax(0,1fr)]">
          <ConversationSidebar
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            filters={filters}
            isApplying={isApplying}
            isLoadingList={isLoadingList}
            isMobileRoomOpen={isMobileRoomOpen}
            conversationListRef={conversationListRef}
            onSidebarScroll={handleSidebarScroll}
            onApplyFilters={handleApplyFilters}
            onFilterChange={handleFilterChange}
            onSelectConversation={handleSelectConversation}
          />

          <div
            className={[
              "flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]",
              isMobileRoomOpen ? "flex" : "hidden lg:flex",
            ].join(" ")}
          >
            {selectedConversation ? (
              <>
                <div className="shrink-0 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setIsMobileRoomOpen(false)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
                        aria-label="Kembali ke daftar percakapan"
                      >
                        <BackIcon />
                      </button>
                      <ConversationAvatar name={selectedConversation.name} large />
                      <div className="min-w-0">
                        <p className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">
                          {selectedConversation.name}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {selectedConversation.email}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={selectedConversation.status} compact />
                          <span className="text-xs uppercase tracking-[0.16em] text-slate-400">
                            {selectedConversation.status === "closed" ? "Percakapan ditutup" : "Percakapan aktif"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDeleteConversationModalOpen(true)}
                        disabled={isDeletingConversation}
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeletingConversation ? "Menghapus..." : "Hapus Chat"}
                      </button>
                      {selectedConversation.status === "closed" ? (
                        <button
                          type="button"
                          onClick={handleReopen}
                          disabled={isReopening}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isReopening ? "Membuka..." : "Buka Kembali"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleClose}
                          disabled={isClosing}
                          className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isClosing ? "Menutup..." : "Tutup"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  ref={messageListRef}
                  onScroll={handleMessageListScroll}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-5 sm:px-5"
                >
                  <div className="space-y-4">
                    {isLoadingDetail ? (
                    <p className="text-center text-sm text-slate-500">Memuat ruang chat...</p>
                    ) : null}

                    {!isLoadingDetail && messages.length === 0 ? (
                      <EmptyPane
                        title="Belum ada pesan"
                        description="Pesan dalam percakapan ini akan muncul di sini."
                      />
                    ) : null}

                    {messages.map((item) => (
                      <AdminMessageRow
                        key={item._stableId}
                        item={item}
                        conversationName={selectedConversation.name}
                        onDelete={() => setMessagePendingDelete(item)}
                      />
                    ))}
                    <div ref={messageBottomRef} />
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white p-4">
                  <div className="mb-4 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-800">
                    Jika user lupa password, jangan minta password lama. Gunakan reset password admin setelah verifikasi identitas.
                  </div>

                  {selectedConversation.status === "closed" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Percakapan ini sudah ditutup.
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleReplySubmit}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <textarea
                          value={reply}
                          onChange={(event) => setReply(event.target.value)}
                          rows={2}
                          maxLength={2000}
                          required
                          placeholder="Tulis balasan admin..."
                          className="min-h-[56px] flex-1 resize-none rounded-[1.5rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs leading-6 text-slate-500 sm:min-w-[180px] sm:self-stretch">
                          <span>Jangan kirim password, API key, atau data sensitif.</span>
                          <span>{reply.length}/{SUPPORT_MESSAGE_LIMIT}</span>
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="shrink-0 rounded-full bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8,_#4338ca)] px-5 py-3 text-sm font-semibold text-white transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSubmitting ? "Mengirim..." : "Kirim"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyPane
                  title="Pilih percakapan"
                  description="Pilih percakapan untuk mulai membalas."
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <ConfirmModal
        isOpen={isDeleteConversationModalOpen}
        title="Hapus percakapan ini?"
        description="Percakapan dan seluruh pesan di dalamnya akan dihapus permanen. Gunakan fitur ini untuk chat yang tidak diperlukan atau berisi data sensitif."
        confirmLabel={isDeletingConversation ? "Menghapus..." : "Hapus Percakapan"}
        onCancel={() => {
          if (!isDeletingConversation) {
            setIsDeleteConversationModalOpen(false);
          }
        }}
        onConfirm={handleDeleteConversation}
        isConfirming={isDeletingConversation}
      />

      <ConfirmModal
        isOpen={Boolean(messagePendingDelete)}
        title="Hapus pesan ini?"
        description="Pesan ini akan dihapus permanen dari percakapan."
        confirmLabel={isDeletingMessage ? "Menghapus..." : "Hapus Pesan"}
        onCancel={() => {
          if (!isDeletingMessage) {
            setMessagePendingDelete(null);
          }
        }}
        onConfirm={handleDeleteMessage}
        isConfirming={isDeletingMessage}
      />
    </div>
  );
}

function AdminMessageRow({ item, conversationName, onDelete }) {
  const isOwnMessage = item.sender_type === "admin";

  return (
    <div className={`group flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-full min-w-0 items-start gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
        <ChatBubble
          message={item.message}
          senderName={item.sender_name || (item.sender_type === "admin" ? "Admin" : conversationName)}
          createdAt={item.created_at}
          isOwnMessage={isOwnMessage}
        />
        <button
          type="button"
          onClick={onDelete}
          className="mt-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 sm:opacity-0 sm:group-hover:opacity-100"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

const ConversationSidebar = memo(function ConversationSidebar({
  conversations,
  selectedConversationId,
  filters,
  isApplying,
  isLoadingList,
  isMobileRoomOpen,
  conversationListRef,
  onSidebarScroll,
  onApplyFilters,
  onFilterChange,
  onSelectConversation,
}) {
  return (
    <aside
      className={[
        "flex h-full min-h-0 flex-col overflow-hidden border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] lg:w-[360px] lg:shrink-0 lg:border-b-0 lg:border-r",
        isMobileRoomOpen ? "hidden lg:flex" : "flex border-b",
      ].join(" ")}
    >
      <div className="shrink-0 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
              Inbox
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Percakapan
            </h2>
          </div>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            {conversations.length} chat
          </span>
        </div>

        <form onSubmit={onApplyFilters} className="mt-5 grid gap-3">
          <input
            name="search"
            value={filters.search}
            onChange={onFilterChange}
            placeholder="Cari nama, email, atau pesan..."
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
          />
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <select
              name="status"
              value={filters.status}
              onChange={onFilterChange}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
            >
              <option value="">Semua Status</option>
              <option value="open">Open</option>
              <option value="waiting_admin">Waiting Admin</option>
              <option value="waiting_user">Waiting User</option>
              <option value="closed">Closed</option>
            </select>
            <button
              type="submit"
              disabled={isApplying}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isApplying ? "..." : "Cari"}
            </button>
          </div>
        </form>
      </div>

      <div
        ref={conversationListRef}
        onScroll={onSidebarScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-3 pr-2 [touch-action:pan-y]"
      >
        {isLoadingList ? (
          <div className="p-2">
            <LoadingState
              title="Memuat percakapan..."
              description="Inbox sedang diperbarui dari backend."
            />
          </div>
        ) : conversations.length > 0 ? (
          <div className="grid gap-3">
            {conversations.map((item) => {
              const isSelected = item._stableId === selectedConversationId;

              return (
                <button
                  key={item._stableId}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.blur();
                    onSelectConversation(item._stableId);
                  }}
                  className={[
                    "flex w-full min-w-0 items-start gap-4 rounded-[1.5rem] border px-4 py-4 text-left transition",
                    isSelected
                      ? "border-slate-300 bg-[linear-gradient(135deg,_rgba(15,23,42,0.06),_rgba(67,56,202,0.07),_rgba(14,165,233,0.08))] shadow-sm shadow-slate-900/5"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <ConversationAvatar name={item.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {item.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {item.email || "Guest / User"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatConversationTime(item.last_message_at || item.created_at)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} compact />
                      {item.unread_for_admin > 0 ? (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {item.unread_for_admin}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 truncate text-sm text-slate-600">
                      {shortSupportPreview(item.last_message || "Belum ada pesan.")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-5">
            <EmptyPane
              title="Belum ada percakapan"
              description="Percakapan dari widget live chat akan muncul di inbox ini."
            />
          </div>
        )}
      </div>
    </aside>
  );
});

function ConversationAvatar({ name, large = false }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "V";

  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#0f172a,_#4338ca,_#0ea5e9)] font-semibold text-white shadow-sm shadow-slate-900/10",
        large ? "h-14 w-14 text-lg" : "h-12 w-12 text-sm",
      ].join(" ")}
    >
      {initial}
    </span>
  );
}

function EmptyPane({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/80 px-5 py-6 text-center shadow-sm">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function SummaryChip({ label, value, tone = "sky" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${tone === "amber" ? "text-amber-700" : "text-sky-700"}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status, compact = false }) {
  const classes = {
    open: "border-slate-200 bg-slate-100 text-slate-700",
    waiting_admin: "border-amber-200 bg-amber-50 text-amber-700",
    waiting_user: "border-sky-200 bg-sky-50 text-sky-700",
    closed: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={[
        "rounded-full border font-semibold capitalize",
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1 text-xs",
        classes[status] || classes.open,
      ].join(" ")}
    >
      {String(status || "open").replace("_", " ")}
    </span>
  );
}

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  );
}

function formatConversationTime(value) {
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

function getConversationId(conversation) {
  if (!conversation || typeof conversation !== "object") {
    return "";
  }

  return String(
    conversation.id
    ?? conversation._id
    ?? conversation.conversation_id
    ?? conversation.conversationId
    ?? "",
  ).trim();
}

function getMessageId(message) {
  if (!message || typeof message !== "object") {
    return "";
  }

  return String(
    message.id
    ?? message._id
    ?? message.message_id
    ?? message.messageId
    ?? "",
  ).trim();
}

function normalizeConversation(conversation) {
  if (!conversation || typeof conversation !== "object") {
    return null;
  }

  const stableId =
    getConversationId(conversation)
    || [
      conversation.email || "guest",
      conversation.name || "conversation",
      conversation.created_at || conversation.updated_at || "unknown",
    ].join("-");

  return {
    ...conversation,
    id: stableId,
    _stableId: stableId,
  };
}

function normalizeMessage(message, index = 0) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const stableId =
    getMessageId(message)
    || [
      message.sender_type || "message",
      message.sender_name || "anonymous",
      message.created_at || "unknown",
      index,
    ].join("-");

  return {
    ...message,
    id: stableId,
    _stableId: stableId,
  };
}

function normalizeConversationList(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => normalizeConversation(item)).filter(Boolean);
}

function normalizeMessageList(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => normalizeMessage(item, index)).filter(Boolean);
}

function mergeConversationList(current, nextConversation) {
  const normalizedConversation = normalizeConversation(nextConversation);

  if (!normalizedConversation?._stableId) {
    return current;
  }

  const nextItems = current.some((item) => item._stableId === normalizedConversation._stableId)
    ? current.map((item) => (
      item._stableId === normalizedConversation._stableId
        ? { ...item, ...normalizedConversation }
        : item
    ))
    : [normalizedConversation, ...current];

  return nextItems.sort((left, right) => {
    const leftTime = new Date(left.last_message_at || left.updated_at || left.created_at || 0).getTime();
    const rightTime = new Date(right.last_message_at || right.updated_at || right.created_at || 0).getTime();

    return rightTime - leftTime;
  });
}

function shortSupportPreview(value, limit = 80) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit - 3)}...`;
}

function isNearBottom(element, threshold = 96) {
  if (!element) {
    return true;
  }

  const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
  return distanceFromBottom <= threshold;
}

function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  isConfirming = false,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/15">
        <p className="text-lg font-semibold text-slate-900">{title}</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function truncateSupportPreview(value, limit = 80) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit - 1)}…`;
}
