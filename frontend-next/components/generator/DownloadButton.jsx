"use client";

import { useState } from "react";
import { downloadHistoryMarkdown } from "@/lib/api";
import { getErrorMessage, getGenerationId } from "@/lib/utils";

export default function DownloadButton({ id, item, className = "" }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    try {
      setIsDownloading(true);
      setError("");
      const generationId = id || getGenerationId(item);

      if (!generationId) {
        if (item) {
          console.log("Download item:", item);
        }

        throw new Error("ID hasil generate tidak ditemukan untuk proses unduh.");
      }

      await downloadHistoryMarkdown(generationId);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className={`inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400 ${className}`}
      >
        {isDownloading ? "Mengunduh..." : "Unduh .md"}
      </button>
      {error ? <p className="text-xs leading-5 text-rose-600">{error}</p> : null}
    </div>
  );
}
