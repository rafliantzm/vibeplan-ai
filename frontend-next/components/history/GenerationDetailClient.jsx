"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import DownloadButton from "@/components/generator/DownloadButton";
import ResultViewer from "@/components/generator/ResultViewer";
import { generateContent, getHistoryDetail } from "@/lib/api";
import { AGENT_OPTIONS } from "@/lib/constants";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  formatDate,
  getErrorMessage,
  getGenerationBadgeClass,
  getGenerationId,
  getGenerationResponseId,
  getGenerationLabel,
} from "@/lib/utils";

export default function GenerationDetailClient({ id, mode = "history" }) {
  const router = useRouter();
  const { isReady, isLoggedIn } = useAuthSession();
  const [generation, setGeneration] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlannerOption, setSelectedPlannerOption] = useState("auto");
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isPlannerSubmitting, setIsPlannerSubmitting] = useState(false);
  const [plannerError, setPlannerError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  async function loadDetail(markLoading = true) {
    try {
      if (markLoading) {
        setIsLoading(true);
      }

      setError("");

      const payload = await getHistoryDetail(id);
      setGeneration(payload?.data || null);
    } catch (detailError) {
      setError(getErrorMessage(detailError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isReady || !isLoggedIn) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoggedIn, isReady]);

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
        message="Silakan login terlebih dahulu untuk membuka detail hasil generate AI."
        actionLabel="Login untuk membuka detail"
        onAction={() => router.push(`/login?redirect=/${mode === "result" ? "result" : "history"}/${id}`)}
      />
    );
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Memuat detail hasil generate..."
        description="Sedang menyiapkan markdown dan informasi dokumen untuk kamu review."
      />
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadDetail} />;
  }

  if (!generation) {
    return (
      <ErrorState
        message="Data hasil generate tidak ditemukan."
        onRetry={() => loadDetail()}
      />
    );
  }

  const generationId = getGenerationId(generation) || id;
  const canGenerateNextStep =
    generation.generation_type === "prd" && Boolean(generationId);
  const projectName = generation.project?.project_name || "Tidak tersedia";
  const selectedAgent =
    generation.json_content?.selected_agent ||
    generation.json_content?.agent_mode ||
    "-";

  async function handleCopyMarkdown() {
    try {
      const markdown = generation.markdown_content || "";

      if (!markdown.trim()) {
        throw new Error("Markdown belum tersedia untuk disalin.");
      }

      await navigator.clipboard.writeText(markdown);
      setCopyStatus("Markdown berhasil disalin.");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch (copyError) {
      setCopyStatus(getErrorMessage(copyError));
      window.setTimeout(() => setCopyStatus(""), 2200);
    }
  }

  async function handleGenerateNextStep() {
    try {
      setIsPlannerSubmitting(true);
      setPlannerError("");

      const isAutoMode = selectedPlannerOption === "auto";

      const response = await generateContent("next-step", {
        source_generation_id: generationId,
        agent_mode: isAutoMode ? "auto" : "manual",
        selected_agent: isAutoMode ? null : selectedPlannerOption,
      });
      const nextStepId = getGenerationResponseId(response);

      if (!nextStepId) {
        console.log("Generate response without recognized ID:", response);
        throw new Error("ID hasil generate tidak ditemukan dari response backend.");
      }

      router.push(`/result/${nextStepId}`);
    } catch (nextStepError) {
      setPlannerError(getErrorMessage(nextStepError));
    } finally {
      setIsPlannerSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2.25rem] border border-white/60 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getGenerationBadgeClass(generation.generation_type)}`}
              >
                {getGenerationLabel(generation.generation_type)}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Project: {projectName}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {generation.title || "Detail hasil generate"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Baca dokumen dengan lebih nyaman, salin isi markdown saat dibutuhkan, atau unduh hasilnya sebagai file `.md` untuk dipakai kembali.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 xl:justify-end">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Copy Markdown
            </button>
            <DownloadButton
              id={generationId}
              item={generation}
              className="min-h-11 rounded-2xl px-5 py-2.5 font-semibold"
            />
            <Link
              href="/history"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Kembali ke History
            </Link>
            <Link
              href="/generate"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Generate Lagi
            </Link>
          </div>
        </div>

        {copyStatus ? (
          <p className="mt-4 text-sm font-medium text-sky-700">{copyStatus}</p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetadataCard label="Tipe Dokumen" value={getGenerationLabel(generation.generation_type)} />
          <MetadataCard label="Project" value={projectName} />
          <MetadataCard label="Agent" value={formatAgentLabel(selectedAgent)} />
          <MetadataCard label="Status" value={mode === "result" ? "Hasil terbaru" : "History tersimpan"} />
          <MetadataCard label="AI Provider" value={generation.ai_provider || "-"} />
          <MetadataCard label="AI Model" value={generation.ai_model || "-"} />
          <MetadataCard label="Dibuat" value={formatDate(generation.created_at)} />
          <MetadataCard label="Diperbarui" value={formatDate(generation.updated_at || generation.created_at)} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {canGenerateNextStep ? (
            <button
              type="button"
              onClick={() => setIsPlannerOpen((current) => !current)}
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
            >
              Generate Next Step dari PRD Ini
            </button>
          ) : null}
        </div>

        {canGenerateNextStep && isPlannerOpen ? (
          <section className="mt-6 rounded-[1.75rem] border border-sky-200 bg-sky-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Next Step Planner
            </p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              Pilih mode atau coding agent
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Gunakan PRD saat ini sebagai sumber utama untuk menyusun roadmap coding baru yang lebih terarah.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                onClick={() => setSelectedPlannerOption("auto")}
                className={`rounded-[1.5rem] border p-4 text-left transition ${
                  selectedPlannerOption === "auto"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold">Auto Recommend Agent</p>
                <p className={`mt-2 text-sm leading-6 ${selectedPlannerOption === "auto" ? "text-slate-200" : "text-slate-500"}`}>
                  AI memilih agent utama paling cocok berdasarkan isi PRD, lalu
                  memberi alternatif jika ada opsi yang relevan.
                </p>
              </button>
              {AGENT_OPTIONS.map((agent) => {
                const isSelected = selectedPlannerOption === agent.value;

                return (
                  <button
                    key={agent.value}
                    type="button"
                    onClick={() => setSelectedPlannerOption(agent.value)}
                    className={`rounded-[1.5rem] border p-4 text-left transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      Manual: {agent.label}
                    </p>
                    <p
                      className={`mt-2 text-sm leading-6 ${
                        isSelected ? "text-slate-200" : "text-slate-500"
                      }`}
                    >
                      {agent.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGenerateNextStep}
                disabled={isPlannerSubmitting}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPlannerSubmitting
                  ? "AI sedang menyusun roadmap coding dan rekomendasi coding agent..."
                  : "Jalankan Next Step Planner"}
              </button>
              <button
                type="button"
                onClick={() => setIsPlannerOpen(false)}
                disabled={isPlannerSubmitting}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tutup
              </button>
            </div>

            {plannerError ? (
              <p className="mt-4 text-sm text-rose-600">{plannerError}</p>
            ) : null}
          </section>
        ) : null}
      </section>

      <ResultViewer
        markdown={generation.markdown_content || ""}
        title={generation.title || "Dokumen AI"}
      />
    </div>
  );
}

function MetadataCard({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-900/5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 break-words text-sm font-medium leading-7 text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

function formatAgentLabel(value) {
  if (!value || value === "-") {
    return "-";
  }

  return String(value)
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
