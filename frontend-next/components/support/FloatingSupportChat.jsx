"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import ErrorState from "@/components/common/ErrorState";
import ChatBubble from "@/components/support/ChatBubble";
import {
  createSupportConversation,
  getSupportConversationMessages,
  sendSupportConversationMessage,
} from "@/lib/api";
import { getToken, getUser, subscribeAuthChange } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

const GUEST_SESSION_STORAGE_KEY = "vibeplan_guest_session_id";
const GUEST_CONVERSATION_STORAGE_KEY = "vibeplan_support_conversation_id";
const INITIAL_GUEST_FORM = {
  name: "",
  email: "",
  message: "",
};
const INITIAL_COMPOSER_FORM = {
  message: "",
};
const SUPPORT_MESSAGE_LIMIT = 2000;

export default function FloatingSupportChat() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState({ token: null, user: null });
  const [guestSessionId, setGuestSessionId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [guestForm, setGuestForm] = useState(INITIAL_GUEST_FORM);
  const [composerForm, setComposerForm] = useState(INITIAL_COMPOSER_FORM);
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const panelRef = useRef(null);
  const messageListRef = useRef(null);

  const isLoggedIn = Boolean(session.token && session.user);
  const isAdmin = session.user?.role === "admin";
  const isAdminPage = pathname?.startsWith("/admin");
  const isConversationClosed = conversation?.status === "closed";
  const shouldShowChatComposer = isLoggedIn || isChatStarted || Boolean(conversationId);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
      syncSession(setSession);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const storedGuestSessionId = getOrCreateGuestSessionId();
      setGuestSessionId(storedGuestSessionId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    function handleAuthChange() {
      syncSession(setSession);
    }

    const unsubscribe = subscribeAuthChange(handleAuthChange);
    return unsubscribe;
  }, [isMounted]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!panelRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const loadConversation = useCallback(async ({ silent = false } = {}) => {
    if (!conversationId || (!isLoggedIn && !guestSessionId)) {
      return;
    }

    try {
      if (!silent) {
        setIsLoadingConversation(true);
      }

      const payload = await getSupportConversationMessages(
        conversationId,
        isLoggedIn ? {} : { guest_session_id: guestSessionId },
      );
      const nextConversation = payload?.data?.conversation || null;
      const nextMessages = payload?.data?.messages || [];

      setConversation(nextConversation);
      setMessages(nextMessages);
      setIsChatStarted(Boolean(nextConversation?.id));

      if (!isLoggedIn && nextConversation) {
        setGuestForm((current) => ({
          ...current,
          name: current.name || nextConversation.name || "",
          email: current.email || nextConversation.email || "",
          message: "",
        }));
      }
    } catch (loadError) {
      const status = loadError?.status;

      if (status === 403 || status === 404) {
        clearStoredConversation(session.user?.id);
        setConversationId("");
        setConversation(null);
        setMessages([]);
        setIsChatStarted(false);
        return;
      }

      setError("Pesan gagal dikirim. Coba lagi.");
    } finally {
      if (!silent) {
        setIsLoadingConversation(false);
      }
    }
  }, [conversationId, guestSessionId, isLoggedIn, session.user?.id]);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const storedConversationId = window.localStorage.getItem(
        getConversationStorageKey(session.user?.id),
      );
      setConversationId(storedConversationId || "");
      setConversation(null);
      setMessages([]);
      setComposerForm(INITIAL_COMPOSER_FORM);
      setIsChatStarted(Boolean(storedConversationId));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMounted, session.user?.id]);

  useEffect(() => {
    if (!isOpen || !conversationId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadConversation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [conversationId, isOpen, loadConversation]);

  useEffect(() => {
    if (!isOpen || !conversationId) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void loadConversation({ silent: true });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [conversationId, isOpen, loadConversation]);

  useEffect(() => {
    if (!isOpen || !messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [isOpen, messages]);

  function resetState() {
    setError("");
    setNotice("");
  }

  function handleGuestChange(event) {
    const { name, value } = event.target;
    setGuestForm((current) => ({ ...current, [name]: value }));
  }

  function handleComposerChange(event) {
    const { name, value } = event.target;
    setComposerForm((current) => ({ ...current, [name]: value }));
  }

  async function handleStartConversation(event) {
    event.preventDefault();

    const nextMessage = isLoggedIn ? composerForm.message : guestForm.message;

    if (nextMessage.trim().length > SUPPORT_MESSAGE_LIMIT) {
      setError("Pesan terlalu panjang. Ringkas pesan maksimal 2000 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      resetState();
      const resolvedGuestSessionId = isLoggedIn ? "" : (guestSessionId || getOrCreateGuestSessionId());

      if (!isLoggedIn && !guestSessionId) {
        setGuestSessionId(resolvedGuestSessionId);
      }

      const payload = isLoggedIn
        ? { message: composerForm.message }
        : {
            guest_session_id: resolvedGuestSessionId,
            name: guestForm.name,
            email: guestForm.email,
            message: guestForm.message,
          };

      const response = await createSupportConversation(payload);
      const nextConversation = response?.data?.conversation || null;
      const nextMessages = response?.data?.messages || [];

      setConversation(nextConversation);
      setMessages(nextMessages);
      setIsChatStarted(Boolean(nextConversation?.id));
      setNotice("Pesan terkirim.");

      if (nextConversation?.id) {
        persistConversationId(nextConversation.id, session.user?.id);
        setConversationId(nextConversation.id);
      }

      setComposerForm(INITIAL_COMPOSER_FORM);
      setGuestForm((current) => ({
        ...current,
        name: nextConversation?.name || current.name,
        email: nextConversation?.email || current.email,
        message: "",
      }));
    } catch (submitError) {
      setError(getErrorMessage(submitError) || "Pesan gagal dikirim. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!conversationId || isConversationClosed) {
      return;
    }

    if (composerForm.message.trim().length > SUPPORT_MESSAGE_LIMIT) {
      setError("Pesan terlalu panjang. Ringkas pesan maksimal 2000 karakter.");
      return;
    }

    try {
      setIsSubmitting(true);
      resetState();
      const resolvedGuestSessionId = isLoggedIn ? "" : (guestSessionId || getOrCreateGuestSessionId());

      if (!isLoggedIn && !guestSessionId) {
        setGuestSessionId(resolvedGuestSessionId);
      }

      const response = await sendSupportConversationMessage(conversationId, {
        ...(isLoggedIn ? {} : { guest_session_id: resolvedGuestSessionId }),
        message: composerForm.message,
      });

      setConversation(response?.data?.conversation || null);
      setMessages(response?.data?.messages || []);
      setIsChatStarted(true);
      setComposerForm(INITIAL_COMPOSER_FORM);
      setNotice(response?.message || "Pesan terkirim.");
    } catch (submitError) {
      setError(getErrorMessage(submitError) || "Pesan gagal dikirim. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartNewConversation() {
    clearStoredConversation(session.user?.id);
    setConversationId("");
    setConversation(null);
    setMessages([]);
    setIsChatStarted(false);
    setComposerForm(INITIAL_COMPOSER_FORM);
    setNotice("");
    setError("");
    setGuestForm((current) => ({
      ...current,
      message: "",
    }));
  }

  if (!isMounted) {
    return null;
  }

  if (isAdmin || isAdminPage) {
    return null;
  }

  return (
    <>
      {isOpen ? (
        <section
          ref={panelRef}
          className="fixed bottom-20 left-4 right-4 z-[100] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 sm:bottom-24 sm:left-auto sm:right-6 sm:w-[380px] sm:max-w-[calc(100vw-2rem)]"
        >
          <div className="flex max-h-[calc(100vh-6rem)] flex-col overflow-hidden bg-white sm:max-h-[calc(100vh-8rem)]">
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <SupportAvatar />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
                      Bantuan
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
                      Chat Admin VibePlan AI
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Admin Support / Online
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Tutup chat bantuan"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div
                ref={conversationId ? messageListRef : null}
                className={[
                  "flex-1 overflow-y-auto overscroll-contain px-5 py-4",
                  conversationId || isLoggedIn ? "bg-slate-50" : "bg-white",
                ].join(" ")}
              >
                {isLoggedIn ? (
                  <div className="mb-4 rounded-[1.5rem] border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    Mengirim sebagai: <span className="font-semibold">{session.user?.name || "User"}</span>
                  </div>
                ) : null}

                {notice ? (
                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {notice}
                  </div>
                ) : null}

                {error ? (
                  <div className="mb-4">
                    <ErrorState message="Pesan gagal dikirim. Coba lagi." />
                  </div>
                ) : null}

                {!isChatStarted && !conversationId ? (
                  <div className="space-y-4">
                    {isLoggedIn ? (
                      <>
                        <ChatBubble
                          message="Halo, ada yang bisa admin bantu?"
                          senderName="Admin"
                          createdAt={new Date().toISOString()}
                        />
                        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-600 shadow-sm">
                          Kirim pesan pertama kamu untuk memulai percakapan langsung dengan admin.
                        </div>
                      </>
                    ) : (
                      <>
                        <ChatBubble
                          message="Halo, admin siap membantu. Jika kamu tidak bisa login, isi nama dan email akun agar admin bisa cek data kamu."
                          senderName="Admin"
                          createdAt={new Date().toISOString()}
                        />
                        <GuestOnboardingCard
                          guestForm={guestForm}
                          isSubmitting={isSubmitting}
                          onChange={handleGuestChange}
                          onSubmit={handleStartConversation}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isLoadingConversation ? (
                      <p className="text-center text-sm text-slate-500">Memuat percakapan...</p>
                    ) : null}

                    {!isLoadingConversation && messages.length === 0 ? (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
                        Mulai percakapan dengan admin.
                      </div>
                    ) : null}

                    {messages.map((item) => (
                      <ChatBubble
                        key={item.id}
                        message={item.message}
                        senderName={item.sender_name || (item.sender_type === "admin" ? "Admin" : "User")}
                        createdAt={item.created_at}
                        isOwnMessage={item.sender_type !== "admin"}
                      />
                    ))}
                  </div>
                )}
              </div>

              {shouldShowChatComposer ? (
                isConversationClosed ? (
                  <div className="shrink-0 border-t border-slate-200 bg-white p-4">
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                      Percakapan ini sudah ditutup. Mulai percakapan baru jika masih butuh bantuan.
                    </div>
                    <button
                      type="button"
                      onClick={handleStartNewConversation}
                      className="mt-4 w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Mulai Percakapan Baru
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={conversationId ? handleSendMessage : handleStartConversation}
                    className="shrink-0 border-t border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <textarea
                          name="message"
                          value={composerForm.message}
                          onChange={handleComposerChange}
                          rows={2}
                          maxLength={2000}
                          required
                          placeholder="Tulis pesan kamu..."
                          className="w-full resize-none rounded-[1.5rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                          <span>Jangan kirim password, API key, atau data sensitif.</span>
                          <span>{composerForm.message.length}/{SUPPORT_MESSAGE_LIMIT}</span>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="shrink-0 rounded-full bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8,_#4338ca)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? "Kirim..." : "Kirim"}
                      </button>
                    </div>
                  </form>
                )
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            resetState();
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-[90] inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,_#0f172a,_#1e3a8a,_#4338ca)] px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-900/20 transition hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-200"
          aria-label="Buka chat bantuan admin"
        >
          <ChatIcon />
          <span className="hidden sm:inline">Bantuan</span>
        </button>
      ) : null}
    </>
  );
}

function Field({ label, type = "text", ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        {...props}
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      />
    </label>
  );
}

function MessageField({ value, onChange, name }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">Pesan</span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        maxLength={2000}
        required
        placeholder="Contoh: Saya tidak bisa generate PRD karena token habis."
        className="resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Jangan kirim password, API key, atau data sensitif.</span>
        <span>{value.length}/{SUPPORT_MESSAGE_LIMIT}</span>
      </div>
    </label>
  );
}

function GuestOnboardingCard({ guestForm, isSubmitting, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Mulai Chat
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tidak bisa login? Tetap bisa chat admin sebagai guest untuk bantuan reset akun.
        </p>
      </div>

      <div className="grid gap-3">
        <CompactField
          label="Nama"
          name="name"
          value={guestForm.name}
          onChange={onChange}
          placeholder="Nama kamu"
          required
        />
        <CompactField
          label="Email akun"
          type="email"
          name="email"
          value={guestForm.email}
          onChange={onChange}
          placeholder="nama@email.com"
          required
        />
        <CompactMessageField
          name="message"
          value={guestForm.message}
          onChange={onChange}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 w-full rounded-full bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8,_#4338ca)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Memulai..." : "Mulai Chat"}
      </button>
    </form>
  );
}

function CompactField({ label, type = "text", ...props }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        type={type}
        {...props}
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      />
    </label>
  );
}

function CompactMessageField({ value, onChange, name }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pesan pertama</span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        maxLength={2000}
        required
        placeholder="Contoh: Saya lupa password dan tidak bisa login."
        className="resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Jangan kirim password, API key, atau data sensitif.</span>
        <span>{value.length}/{SUPPORT_MESSAGE_LIMIT}</span>
      </div>
    </label>
  );
}

function SupportAvatar() {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#0f172a,_#4338ca,_#0ea5e9)] text-white shadow-sm shadow-slate-900/10">
      <ChatIcon />
    </span>
  );
}

function syncSession(setSession) {
  setSession({
    token: getToken(),
    user: getUser(),
  });
}

function getOrCreateGuestSessionId() {
  const current = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);

  if (current) {
    return current;
  }

  const nextId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, nextId);
  return nextId;
}

function getConversationStorageKey(userId) {
  return userId ? `vibeplan_support_conversation_id_user_${userId}` : GUEST_CONVERSATION_STORAGE_KEY;
}

function persistConversationId(nextConversationId, userId) {
  window.localStorage.setItem(getConversationStorageKey(userId), nextConversationId);
}

function clearStoredConversation(userId) {
  window.localStorage.removeItem(getConversationStorageKey(userId));
}

function ChatIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M21 11.5c0 4.7-4 8.5-9 8.5a9.8 9.8 0 0 1-4-.8L3 21l1.3-4.2A8 8 0 0 1 3 11.5C3 6.8 7 3 12 3s9 3.8 9 8.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M5 5 15 15" />
      <path d="M15 5 5 15" />
    </svg>
  );
}
