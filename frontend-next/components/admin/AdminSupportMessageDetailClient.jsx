"use client";

import { useCallback, useEffect, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import {
  adminCloseSupportMessage,
  adminGetSupportMessage,
  adminReplySupportMessage,
} from "@/lib/api";
import { getUser, subscribeAuthChange } from "@/lib/auth";
import { formatDate, getErrorMessage } from "@/lib/utils";

export default function AdminSupportMessageDetailClient({ messageId }) {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(null);
  const [reply, setReply] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  const loadMessage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const payload = await adminGetSupportMessage(messageId);
      const item = payload?.data || null;
      setMessage(item);
      setReply(item?.admin_reply || "");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [messageId]);

  useEffect(() => {
    if (!isMounted || !isAdmin || !messageId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadMessage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, isMounted, loadMessage, messageId]);

  async function handleReplySubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      setNotice("");
      const payload = await adminReplySupportMessage(messageId, {
        admin_reply: reply,
      });
      setMessage(payload?.data || null);
      setNotice(payload?.message || "Balasan admin berhasil disimpan.");
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
      const payload = await adminCloseSupportMessage(messageId);
      setMessage(payload?.data || null);
      setNotice(payload?.message || "Pesan bantuan berhasil ditutup.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsClosing(false);
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
        message="Silakan login dengan akun admin untuk membuka detail chat support."
        actionLabel={user ? "Kembali ke Home" : "Login Admin"}
        onAction={() => {
          window.location.href = user ? "/" : `/login?redirect=/admin/support-messages/${messageId || ""}`;
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Memuat detail pesan..."
        description="Data pesan support sedang diambil dari backend Laravel."
      />
    );
  }

  if (error && !message) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          Detail Support
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Detail pesan bantuan
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Balasan tersimpan di dashboard admin. Pengiriman balasan via email dapat ditambahkan pada versi berikutnya.
        </p>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {notice ? (
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
          {notice}
        </div>
      ) : null}

      {message ? (
        <>
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{message.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{message.email}</p>
              </div>
              <StatusBadge status={message.status} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoItem label="User ID" value={message.user_id || "-"} />
              <InfoItem label="Dibuat" value={formatDate(message.created_at)} />
              <InfoItem label="Replied At" value={formatDate(message.replied_at)} />
              <InfoItem label="Replied By" value={message.replied_by_admin?.name || "-"} />
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Pesan User
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {message.message}
              </p>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-sky-800">
              Balasan tersimpan di dashboard admin. Pengiriman balasan via email dapat ditambahkan pada versi berikutnya.
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Balas pesan</h2>

            <form onSubmit={handleReplySubmit} className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Balasan Admin</span>
                <textarea
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={6}
                  maxLength={2000}
                  required
                  className="resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSubmitting ? "Menyimpan..." : "Kirim Balasan"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isClosing || message.status === "closed"}
                  className="rounded-full border border-rose-200 px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClosing ? "Menutup..." : "Close"}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-slate-900">{value || "-"}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    open: "border-amber-200 bg-amber-50 text-amber-700",
    replied: "border-sky-200 bg-sky-50 text-sky-700",
    closed: "border-slate-200 bg-slate-100 text-slate-700",
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${classes[status] || classes.open}`}>
      {status}
    </span>
  );
}
