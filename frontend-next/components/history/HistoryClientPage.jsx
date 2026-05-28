"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import HistoryFilter from "@/components/history/HistoryFilter";
import HistoryList from "@/components/history/HistoryList";
import { getHistory } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import { getErrorMessage } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function HistoryClientPage() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useAuthSession();
  const [generationType, setGenerationType] = useState("");
  const [historyState, setHistoryState] = useState({
    items: [],
    currentPage: 1,
    lastPage: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory(nextPage = 1, nextGenerationType = generationType) {
    try {
      setIsLoading(true);
      setError("");

      const payload = await getHistory({
        page: nextPage,
        per_page: 12,
        generation_type: nextGenerationType,
      });

      setHistoryState({
        items: payload?.data || [],
        currentPage: payload?.current_page || 1,
        lastPage: payload?.last_page || 1,
      });
    } catch (historyError) {
      setError(getErrorMessage(historyError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isReady || !isLoggedIn) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadHistory(1, generationType);
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationType, isLoggedIn, isReady]);

  function handleGenerationTypeChange(value) {
    setGenerationType(value);
  }

  function handleDeleted(id) {
    setHistoryState((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== id && item._id !== id),
    }));
  }

  if (!isReady) {
    return (
      <LoadingState
        title="Memeriksa sesi login..."
        description="Mohon tunggu, status autentikasi sedang disiapkan."
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginRequiredCard
        message="Silakan login terlebih dahulu untuk melihat history hasil generate AI kamu."
        actionLabel="Login untuk melihat history"
        onAction={() => router.push("/login?redirect=/history")}
      />
    );
  }

  return (
    <div className="grid w-full max-w-full min-w-0 gap-6">
      <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">
              History
            </p>
            <h1 className="mt-3 max-w-full break-words text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Semua hasil generate tersimpan di satu tempat
            </h1>
            <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-slate-600 sm:text-base">
              Lihat kembali semua hasil generate yang pernah kamu buat, buka
              detailnya, unduh file Markdown, atau hapus data yang sudah tidak
              diperlukan.
            </p>
          </div>
          <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              Ringkasan
            </p>
            <div className="mt-4 grid gap-3">
              <InfoTile
                label="Status"
                value={isLoading ? "Memuat history" : `${historyState.items.length} item di halaman ini`}
              />
              <InfoTile
                label="Filter Aktif"
                value={generationType ? generationType : "Semua hasil generate"}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <HistoryFilter
            generationType={generationType}
            onGenerationTypeChange={handleGenerationTypeChange}
          />
          <div className="flex w-full flex-wrap gap-3 md:w-auto">
            <Link
              href="/generate"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Buat generate baru
            </Link>
          </div>
        </div>
      </section>

      {isLoading ? (
        <LoadingState
          title="Memuat daftar history..."
          description="Mohon tunggu, hasil generate kamu sedang disiapkan."
        />
      ) : null}

      {!isLoading && error ? (
        <ErrorState message={error} onRetry={() => loadHistory()} />
      ) : null}

      {!isLoading && !error && historyState.items.length === 0 ? (
        <EmptyState
          title="Belum ada history generate"
          description="Buat PRD, Next Step Planner, atau Coding Prompt terlebih dahulu. Hasil yang berhasil disimpan akan muncul di halaman ini agar mudah dibuka kembali."
          action={
            <Link
              href="/generate"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Buka halaman generate
            </Link>
          }
        />
      ) : null}

      {!isLoading && !error && historyState.items.length > 0 ? (
        <>
          <HistoryList items={historyState.items} onDeleted={handleDeleted} />
          <div className="flex w-full max-w-full min-w-0 flex-col gap-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm shadow-slate-900/5 md:flex-row md:items-center md:justify-between">
            <p className="font-medium text-slate-700">
              Halaman {historyState.currentPage} dari {historyState.lastPage}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={historyState.currentPage <= 1}
                onClick={() => {
                  void loadHistory(historyState.currentPage - 1);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={historyState.currentPage >= historyState.lastPage}
                onClick={() => {
                  void loadHistory(historyState.currentPage + 1);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">
        {value}
      </p>
    </div>
  );
}
