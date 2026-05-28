"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminGetSupportConversations,
  getAdminTokenResetRequests,
} from "@/lib/api";
import { getUser, subscribeAuthChange } from "@/lib/auth";

const TOKEN_COUNT_STORAGE_KEY = "vibeplan_admin_last_token_request_count";
const TOKEN_LATEST_STORAGE_KEY = "vibeplan_admin_last_token_request_id";
const SUPPORT_COUNT_STORAGE_KEY = "vibeplan_admin_last_support_unread_count";
const SUPPORT_LATEST_STORAGE_KEY = "vibeplan_admin_last_support_unread_id";
const TOAST_DURATION_MS = 8000;

export default function AdminNotificationCenter() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [toasts, setToasts] = useState([]);
  const summaryRef = useRef(null);
  const isInitializedRef = useRef(false);
  const activeToastSignaturesRef = useRef(new Set());

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
      const nextUser = getUser();
      setUser(nextUser);

      if (nextUser?.role !== "admin") {
        setToasts([]);
        summaryRef.current = null;
        isInitializedRef.current = false;
        activeToastSignaturesRef.current.clear();
      }
    }

    const unsubscribe = subscribeAuthChange(syncUser);
    return unsubscribe;
  }, [isMounted]);

  const isAdmin = user?.role === "admin";

  const removeToast = useCallback((toastId) => {
    setToasts((current) => {
      const targetToast = current.find((item) => item.id === toastId);

      if (targetToast?.signature) {
        activeToastSignaturesRef.current.delete(targetToast.signature);
      }

      return current.filter((item) => item.id !== toastId);
    });
  }, []);

  const pushToast = useCallback((toast) => {
    const signature = [
      toast.kind,
      toast.title,
      toast.description,
      toast.actionHref || "",
    ].join("::");

    if (activeToastSignaturesRef.current.has(signature)) {
      return;
    }

    const nextId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextToast = {
      id: nextId,
      signature,
      ...toast,
    };

    activeToastSignaturesRef.current.add(signature);
    setToasts((current) => [nextToast, ...current].slice(0, 4));

    window.setTimeout(() => {
      removeToast(nextId);
    }, TOAST_DURATION_MS);
  }, [removeToast]);

  const persistSummary = useCallback((summary) => {
    window.localStorage.setItem(TOKEN_COUNT_STORAGE_KEY, String(summary.pendingTokenRequests));
    window.localStorage.setItem(TOKEN_LATEST_STORAGE_KEY, summary.latestTokenRequest?.id || "");
    window.localStorage.setItem(SUPPORT_COUNT_STORAGE_KEY, String(summary.unreadSupportConversations));
    window.localStorage.setItem(SUPPORT_LATEST_STORAGE_KEY, summary.latestSupportConversation?.id || "");
  }, []);

  const loadSummary = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    const [tokenPayload, supportPayload] = await Promise.all([
      getAdminTokenResetRequests(),
      adminGetSupportConversations(),
    ]);

    const tokenRequests = tokenPayload?.data || [];
    const supportConversations = supportPayload?.data || [];

    const pendingRequests = tokenRequests.filter((item) => item.status === "pending");
    const unreadSupport = supportConversations.filter((item) =>
      Number(item.unread_for_admin || 0) > 0 || item.status === "waiting_admin"
    );

    const summary = {
      pendingTokenRequests: pendingRequests.length,
      unreadSupportConversations: unreadSupport.length,
      latestTokenRequest: pendingRequests[0]
        ? {
            id: pendingRequests[0].id || pendingRequests[0]._id || "",
            name: pendingRequests[0].user?.name || pendingRequests[0].name || "User",
            email: pendingRequests[0].user?.email || pendingRequests[0].email || "",
          }
        : null,
      latestSupportConversation: unreadSupport[0]
        ? {
            id: unreadSupport[0].id || unreadSupport[0]._id || "",
            name: unreadSupport[0].name || "User",
            email: unreadSupport[0].email || "",
            last_message: unreadSupport[0].last_message || "",
          }
        : null,
    };

    const previousSummary = summaryRef.current;

    if (!isInitializedRef.current) {
      const storedSummary = {
        pendingTokenRequests: Number(window.localStorage.getItem(TOKEN_COUNT_STORAGE_KEY) || summary.pendingTokenRequests || 0),
        unreadSupportConversations: Number(window.localStorage.getItem(SUPPORT_COUNT_STORAGE_KEY) || summary.unreadSupportConversations || 0),
        latestTokenRequest: {
          id: window.localStorage.getItem(TOKEN_LATEST_STORAGE_KEY) || summary.latestTokenRequest?.id || "",
        },
        latestSupportConversation: {
          id: window.localStorage.getItem(SUPPORT_LATEST_STORAGE_KEY) || summary.latestSupportConversation?.id || "",
          last_message: "",
        },
      };

      summaryRef.current = storedSummary;
      persistSummary(summary);
      isInitializedRef.current = true;
      return;
    }

    if (previousSummary) {
      if (
        summary.latestTokenRequest?.id &&
        (
          summary.pendingTokenRequests > previousSummary.pendingTokenRequests ||
          summary.latestTokenRequest.id !== previousSummary.latestTokenRequest?.id
        )
      ) {
        pushToast({
          kind: "token",
          title: "Token request baru",
          description:
            summary.pendingTokenRequests > 1
              ? `${summary.pendingTokenRequests} permintaan token perlu ditinjau.`
              : "Ada permintaan token yang perlu ditinjau.",
          actionLabel: "Lihat Request",
          actionHref: "/admin/token-requests",
          onAction: () => router.push("/admin/token-requests"),
        });
      }

      if (
        summary.latestSupportConversation?.id &&
        (
          summary.unreadSupportConversations > previousSummary.unreadSupportConversations ||
          summary.latestSupportConversation.id !== previousSummary.latestSupportConversation?.id ||
          summary.latestSupportConversation.last_message !== previousSummary.latestSupportConversation?.last_message
        )
      ) {
        pushToast({
          kind: "chat",
          title: "Chat support baru",
          description:
            summary.unreadSupportConversations > 1
              ? `${summary.unreadSupportConversations} chat support menunggu balasan.`
              : "User atau guest mengirim pesan bantuan.",
          actionLabel: "Buka Chat",
          actionHref: "/admin/support-conversations",
          onAction: () => router.push("/admin/support-conversations"),
        });
      }
    }

    summaryRef.current = summary;
    persistSummary(summary);
  }, [isAdmin, persistSummary, pushToast, router]);

  useEffect(() => {
    if (!isMounted || !isAdmin) {
      summaryRef.current = null;
      isInitializedRef.current = false;
      return undefined;
    }

    void loadSummary();

    const intervalId = window.setInterval(() => {
      void loadSummary();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [isAdmin, isMounted, loadSummary]);

  if (!isMounted || !isAdmin || toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] space-y-3 sm:inset-x-auto sm:right-6 sm:top-28 sm:bottom-auto sm:w-[360px] sm:max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <article
          key={toast.id}
          className="pointer-events-auto rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={getToastBadgeClassName(toast.kind)}>
                {toast.kind === "token" ? "Token Requests" : "Live Chat Support"}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-950">
                {toast.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {toast.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Tutup notifikasi"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                removeToast(toast.id);
              }}
              className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              {toast.actionLabel}
            </button>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-sm font-medium text-slate-500 transition hover:text-slate-800 sm:text-right"
            >
              Nanti
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function getToastBadgeClassName(kind) {
  if (kind === "token") {
    return "inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700";
  }

  return "inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700";
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
