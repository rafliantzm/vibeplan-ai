"use client";

import Link from "next/link";
import { useState } from "react";
import DownloadButton from "@/components/generator/DownloadButton";
import { deleteHistoryItem } from "@/lib/api";
import {
  formatDate,
  getErrorMessage,
  getGenerationBadgeClass,
  getGenerationId,
  getGenerationLabel,
} from "@/lib/utils";

export default function HistoryCard({ item, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const generationId = getGenerationId(item);

  async function handleDelete() {
    const isConfirmed = window.confirm(
      "Hapus hasil generate ini dari history?"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      setError("");
      await deleteHistoryItem(generationId);
      onDeleted(generationId);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getGenerationBadgeClass(item.generation_type)}`}
            >
              {getGenerationLabel(item.generation_type)}
            </span>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {formatDate(item.created_at)}
            </span>
          </div>
          <h3 className="mt-4 text-lg font-semibold leading-8 text-slate-950 sm:text-xl">
            {item.title || "Hasil generate tanpa judul"}
          </h3>
          <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-7 text-slate-600">
            {item.markdown_content?.slice(0, 240) ||
              "Preview markdown belum tersedia."}
          </p>
        </div>

        <div className="grid w-full max-w-full min-w-0 gap-3 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 lg:min-w-[240px]">
          <MetaRow
            label="Project"
            value={item.project?.project_name || "Tidak tersedia"}
          />
          <MetaRow
            label="Status"
            value="Tersimpan"
          />
        </div>
      </div>

      <div className="mt-6 flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap gap-3">
          <Link
            href={`/history/${generationId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Detail history
          </Link>
          <Link
            href={`/result/${generationId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Buka result
          </Link>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
          <DownloadButton id={generationId} item={item} className="min-h-11 rounded-2xl px-5 py-2.5 font-semibold" />
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || !generationId}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {!generationId ? (
        <p className="mt-3 text-sm text-rose-600">
          ID hasil generate tidak ditemukan untuk item ini.
        </p>
      ) : null}
    </article>
  );
}

function MetaRow({ label, value }) {
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
