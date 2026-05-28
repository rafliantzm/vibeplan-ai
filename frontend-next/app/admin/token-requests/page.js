"use client";

import { useEffect, useMemo, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import {
  getAdminTokenResetRequests,
  updateAdminTokenResetRequest,
} from "@/lib/api";
import { getUser, subscribeAuthChange } from "@/lib/auth";
import { formatDate, getErrorMessage } from "@/lib/utils";

const CARD_CLASS =
  "w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-900/5 sm:p-6";
const INPUT_CLASS =
  "block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200";
const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300";
const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-rose-100 disabled:text-rose-300";

export default function AdminTokenRequestsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionState, setActionState] = useState({});
  const [activeRequestId, setActiveRequestId] = useState("");
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

  useEffect(() => {
    if (!isMounted || !isAdmin) {
      return;
    }

    void loadRequests();
  }, [isAdmin, isMounted]);

  const summary = useMemo(() => {
    return requests.reduce(
      (accumulator, item) => {
        const status = item.status || "pending";
        if (status === "approved") {
          accumulator.approved += 1;
        } else if (status === "rejected") {
          accumulator.rejected += 1;
        } else {
          accumulator.pending += 1;
        }
        return accumulator;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );
  }, [requests]);

  async function loadRequests() {
    try {
      setIsLoading(true);
      setError("");
      const payload = await getAdminTokenResetRequests();
      setRequests(payload?.data || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  function updateDraft(id, patch) {
    setActionState((current) => ({
      ...current,
      [id]: {
        token_amount: current[id]?.token_amount || 10,
        admin_note: current[id]?.admin_note || "",
        ...current[id],
        ...patch,
      },
    }));
  }

  async function handleAction(id, status) {
    const draft = actionState[id] || {};

    try {
      setActiveRequestId(id);
      setError("");
      setNotice("");
      await updateAdminTokenResetRequest(id, {
        status,
        admin_note: draft.admin_note || "",
        token_amount: Number(draft.token_amount || 10),
      });
      setNotice(
        status === "approved"
          ? "Permintaan token berhasil di-approve."
          : "Permintaan token berhasil di-reject."
      );
      await loadRequests();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setActiveRequestId("");
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
        message="Silakan login dengan akun admin untuk membuka daftar permintaan token."
        actionLabel={user ? "Kembali ke Home" : "Login Admin"}
        onAction={() => {
          window.location.href = user ? "/" : "/login?redirect=/admin/token-requests";
        }}
      />
    );
  }

  return (
    <div className="grid w-full max-w-full gap-6">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/60 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-orange-300/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">
              Admin Token Requests
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Token Requests
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Tinjau permintaan token dari user, lalu approve atau reject sesuai kebutuhan.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Review Status
            </p>
            <div className="mt-4 grid gap-3">
              <SummaryPill label="Perlu ditinjau" value={`${summary.pending} pending`} tone="amber" />
              <SummaryPill label="Disetujui" value={`${summary.approved} approved`} tone="emerald" />
              <SummaryPill label="Ditolak" value={`${summary.rejected} rejected`} tone="rose" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Pending Requests"
          value={summary.pending}
          caption="Permintaan token yang menunggu keputusan admin."
          tone="amber"
        />
        <SummaryCard
          title="Approved Requests"
          value={summary.approved}
          caption="Permintaan yang sudah disetujui dan diberi token."
          tone="emerald"
        />
        <SummaryCard
          title="Rejected Requests"
          value={summary.rejected}
          caption="Permintaan yang tidak dilanjutkan atau ditolak."
          tone="rose"
        />
      </section>

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState
          title="Memuat token requests..."
          description="Daftar permintaan token sedang disiapkan."
        />
      ) : null}

      {!isLoading && error ? <ErrorState message={error} onRetry={loadRequests} /> : null}

      {!isLoading && !error && requests.length === 0 ? (
        <section className={CARD_CLASS}>
          <h2 className="text-xl font-semibold text-slate-900">
            Belum ada permintaan token yang perlu ditinjau.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Saat user mengirim permintaan reset atau penambahan token, daftar tersebut akan muncul di halaman ini.
          </p>
        </section>
      ) : null}

      {!isLoading && !error && requests.length > 0 ? (
        <div className="grid gap-4">
          {requests.map((item) => {
            const requestId = item.id || item._id;
            const draft = actionState[requestId] || {
              token_amount: Number(item.token_amount || 10),
              admin_note: "",
            };
            const isBusy = activeRequestId === requestId;

            return (
              <article key={requestId} className={CARD_CLASS}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={item.status} />
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <h2 className="mt-4 break-words text-xl font-semibold text-slate-900">
                      {item.user?.name || "User"}
                    </h2>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {item.user?.email || "-"}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <InfoBlock
                        label="Request ID"
                        value={requestId}
                      />
                      <InfoBlock
                        label="Token Saat Ini"
                        value={`${item.user?.token_balance ?? 0}`}
                      />
                      <InfoBlock
                        label="Token Request"
                        value={`${item.requested_token_amount ?? item.token_amount ?? draft.token_amount ?? 10}`}
                      />
                      <InfoBlock
                        label="Status"
                        value={String(item.status || "pending")}
                      />
                    </div>

                    <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Alasan User
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {item.reason || "User tidak menuliskan alasan tambahan."}
                      </p>
                    </div>
                  </div>

                  <div className="grid w-full gap-4 rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 lg:max-w-sm">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        Token amount
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={draft.token_amount}
                        onChange={(event) =>
                          updateDraft(requestId, { token_amount: event.target.value })
                        }
                        className={INPUT_CLASS}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        Admin note
                      </span>
                      <textarea
                        rows={3}
                        value={draft.admin_note}
                        onChange={(event) =>
                          updateDraft(requestId, { admin_note: event.target.value })
                        }
                        placeholder="Tambahkan catatan singkat jika diperlukan."
                        className={`${INPUT_CLASS} min-h-24 resize-none`}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleAction(requestId, "approved")}
                        disabled={isBusy}
                        className={PRIMARY_BUTTON_CLASS}
                      >
                        {isBusy ? "Memproses..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(requestId, "rejected")}
                        disabled={isBusy}
                        className={SECONDARY_BUTTON_CLASS}
                      >
                        {isBusy ? "Memproses..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ title, value, caption, tone }) {
  return (
    <div className={`${CARD_CLASS} ${getSummaryCardTone(tone)}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {caption}
      </p>
    </div>
  );
}

function SummaryPill({ label, value, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${getToneTextClassName(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }) {
  const badgeClass = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rejected: "border-rose-200 bg-rose-50 text-rose-700",
  }[status] || "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeClass}`}>
      {String(status || "pending")}
    </span>
  );
}

function getSummaryCardTone(tone) {
  const classes = {
    amber: "bg-gradient-to-br from-amber-50 to-white",
    emerald: "bg-gradient-to-br from-emerald-50 to-white",
    rose: "bg-gradient-to-br from-rose-50 to-white",
  };

  return classes[tone] || "";
}

function getToneTextClassName(tone) {
  const classes = {
    amber: "text-amber-700",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
  };

  return classes[tone] || "text-slate-900";
}
