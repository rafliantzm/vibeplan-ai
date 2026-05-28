"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import LoadingState from "@/components/common/LoadingState";
import TokenLimitCard from "@/components/common/TokenLimitCard";
import GeneratorForm from "@/components/generator/GeneratorForm";
import GenerationTypeSelector from "@/components/generator/GenerationTypeSelector";
import { createTokenResetRequest, generateContent } from "@/lib/api";
import { getUser, subscribeAuthChange, updateStoredUser } from "@/lib/auth";
import { AGENT_OPTIONS, DEFAULT_FORM, GENERATION_TYPES } from "@/lib/constants";
import { getErrorMessage, getGenerationResponseId } from "@/lib/utils";

const GENERATION_CONTEXT = {
  prd: {
    badge: "PRD Generator",
    title: "Susun kebutuhan project dengan lebih terarah",
    description:
      "Isi informasi utama project untuk menghasilkan Product Requirements Document yang jelas, rapi, dan siap digunakan sebagai dasar pengembangan.",
    helper: "Lengkapi detail inti project pada form berikut.",
  },
  "next-step": {
    badge: "Next Step Planner",
    title: "Ubah ide project menjadi langkah kerja yang jelas",
    description:
      "Masukkan informasi project untuk mendapatkan rencana langkah selanjutnya yang lebih terstruktur setelah PRD selesai dibuat.",
    helper: "Isi detail project agar roadmap yang dihasilkan lebih relevan.",
  },
  "coding-prompt": {
    badge: "Coding Prompt Generator",
    title: "Siapkan prompt coding yang lebih siap pakai",
    description:
      "Isi konteks project untuk menghasilkan prompt coding yang lebih terarah, praktis, dan sesuai dengan kebutuhan implementasi.",
    helper: "Berikan detail yang cukup agar prompt yang dihasilkan lebih akurat.",
  },
};

const SUBMIT_LABELS = {
  prd: "Generate PRD",
  "next-step": "Generate Next Step Planner",
  "coding-prompt": "Generate Coding Prompts dari Next Step Planner",
};

const LOADING_LABELS = {
  prd: "AI sedang menyusun PRD...",
  "next-step": "AI sedang menyusun roadmap coding dan rekomendasi coding agent...",
  "coding-prompt": "AI sedang membuat prompt coding berdasarkan Next Step Planner...",
};

const GENERATION_HINTS = {
  prd: {
    workflow: "Mulai dari brief project",
    outcome: "PRD yang rapi dan siap dipakai sebagai dasar pengembangan",
  },
  "next-step": {
    workflow: "Susun roadmap dari brief project atau file PRD",
    outcome: "Langkah kerja yang lebih terarah untuk implementasi coding",
  },
  "coding-prompt": {
    workflow: "Gunakan roadmap yang sudah ada",
    outcome: "Prompt coding yang lebih siap salin-tempel untuk agent pilihanmu",
  },
};

export default function GeneratorWorkspace() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [generationType, setGenerationType] = useState("prd");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [plannerAgent, setPlannerAgent] = useState("auto");
  const [prdSourceMode, setPrdSourceMode] = useState("form");
  const [nextStepGenerationMode, setNextStepGenerationMode] = useState("normal");
  const [uploadedPrdMarkdown, setUploadedPrdMarkdown] = useState("");
  const [uploadedPrdFilename, setUploadedPrdFilename] = useState("");
  const [uploadedPrdPreview, setUploadedPrdPreview] = useState("");
  const [uploadedPrdFileSize, setUploadedPrdFileSize] = useState(0);
  const [uploadedPrdCharCount, setUploadedPrdCharCount] = useState(0);
  const [codingPromptAgent, setCodingPromptAgent] = useState("codex");
  const [codingPromptGenerationMode, setCodingPromptGenerationMode] = useState("normal");
  const [uploadedNextStepMarkdown, setUploadedNextStepMarkdown] = useState("");
  const [uploadedNextStepFilename, setUploadedNextStepFilename] = useState("");
  const [uploadedNextStepPreview, setUploadedNextStepPreview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [quotaState, setQuotaState] = useState(null);

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

  const isLoggedIn = Boolean(user);

  const activeGeneration =
    GENERATION_TYPES.find((item) => item.value === generationType) ||
    GENERATION_TYPES[0];
  const activeContext =
    GENERATION_CONTEXT[generationType] || GENERATION_CONTEXT.prd;
  const activeHint = GENERATION_HINTS[generationType] || GENERATION_HINTS.prd;
  const submitLabel = SUBMIT_LABELS[generationType] || SUBMIT_LABELS.prd;
  const loadingLabel = LOADING_LABELS[generationType] || "Memproses...";

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handlePrdSourceModeChange(mode) {
    setPrdSourceMode(mode);
    setError("");
    setQuotaState(null);
  }

  async function handlePrdFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setUploadedPrdMarkdown("");
      setUploadedPrdFilename("");
      setUploadedPrdPreview("");
      setUploadedPrdFileSize(0);
      setUploadedPrdCharCount(0);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isAllowedExtension = lowerName.endsWith(".md") || lowerName.endsWith(".txt");

    if (!isAllowedExtension) {
      setUploadedPrdMarkdown("");
      setUploadedPrdFilename("");
      setUploadedPrdPreview("");
      setUploadedPrdFileSize(0);
      setUploadedPrdCharCount(0);
      setError("File PRD harus berformat .md atau .txt.");
      return;
    }

    if (file.size > 1024 * 1024) {
      setUploadedPrdMarkdown("");
      setUploadedPrdFilename("");
      setUploadedPrdPreview("");
      setUploadedPrdFileSize(0);
      setUploadedPrdCharCount(0);
      setError("Ukuran file PRD maksimal 1MB.");
      return;
    }

    try {
      const content = await file.text();
      const trimmedContent = content.trim();

      if (!trimmedContent) {
        setUploadedPrdMarkdown("");
        setUploadedPrdFilename("");
        setUploadedPrdPreview("");
        setUploadedPrdFileSize(0);
        setUploadedPrdCharCount(0);
        setError("File PRD kosong. Upload file yang berisi markdown PRD.");
        return;
      }

      setUploadedPrdMarkdown(content);
      setUploadedPrdFilename(file.name);
      setUploadedPrdPreview(trimmedContent.slice(0, 600));
      setUploadedPrdFileSize(file.size);
      setUploadedPrdCharCount(content.length);
      setError("");
      setQuotaState(null);
    } catch {
      setUploadedPrdMarkdown("");
      setUploadedPrdFilename("");
      setUploadedPrdPreview("");
      setUploadedPrdFileSize(0);
      setUploadedPrdCharCount(0);
      setError("File PRD tidak dapat dibaca. Coba upload ulang file .md atau .txt.");
    }
  }

  async function handleNextStepFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setUploadedNextStepMarkdown("");
      setUploadedNextStepFilename("");
      setUploadedNextStepPreview("");
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isAllowedExtension = lowerName.endsWith(".md") || lowerName.endsWith(".txt");

    if (!isAllowedExtension) {
      setUploadedNextStepMarkdown("");
      setUploadedNextStepFilename("");
      setUploadedNextStepPreview("");
      setError("File Next Step Planner harus berformat .md atau .txt.");
      return;
    }

    if (file.size > 1024 * 1024) {
      setUploadedNextStepMarkdown("");
      setUploadedNextStepFilename("");
      setUploadedNextStepPreview("");
      setError("Ukuran file Next Step Planner maksimal 1MB.");
      return;
    }

    try {
      const content = await file.text();
      const trimmedContent = content.trim();

      if (!trimmedContent) {
        setUploadedNextStepMarkdown("");
        setUploadedNextStepFilename("");
        setUploadedNextStepPreview("");
        setError("File Next Step Planner kosong. Upload file markdown yang berisi roadmap.");
        return;
      }

      setUploadedNextStepMarkdown(content);
      setUploadedNextStepFilename(file.name);
      setUploadedNextStepPreview(trimmedContent.slice(0, 600));
      setError("");
      setQuotaState(null);
    } catch {
      setUploadedNextStepMarkdown("");
      setUploadedNextStepFilename("");
      setUploadedNextStepPreview("");
      setError("File Next Step Planner tidak dapat dibaca. Coba upload ulang file .md atau .txt.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    let payload = null;

    try {
      setIsSubmitting(true);
      setError("");
      setQuotaState(null);

      payload =
        generationType === "next-step"
          ? buildNextStepPayload({
              form,
              prdSourceMode,
              uploadedPrdMarkdown,
              uploadedPrdFilename,
              plannerAgent,
            })
          : generationType === "coding-prompt"
            ? buildCodingPromptPayload({
                uploadedNextStepMarkdown,
                uploadedNextStepFilename,
                codingPromptAgent,
                codingPromptGenerationMode,
              })
            : form;

      await submitGenerationRequest(generationType, payload, router);
    } catch (submitError) {
      if (
        submitError?.errorCode === "TOKEN_EMPTY" ||
        submitError?.errorCode === "PROVIDER_LIMIT" ||
        submitError?.errorCode === "OUTPUT_TRUNCATED" ||
        submitError?.errorCode === "INPUT_TOO_LARGE"
      ) {
        setQuotaState({
          errorCode: submitError.errorCode,
          generationType,
          payload,
        });
        return;
      }

      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompactRetry() {
    if (!quotaState?.payload) {
      return;
    }

    const compactPayload = {
      ...quotaState.payload,
      generation_mode: "compact",
    };

    try {
      setIsSubmitting(true);
      setError("");

      await submitGenerationRequest(quotaState.generationType, compactPayload, router);
    } catch (submitError) {
      if (
        submitError?.errorCode === "PROVIDER_LIMIT" ||
        submitError?.errorCode === "OUTPUT_TRUNCATED" ||
        submitError?.errorCode === "INPUT_TOO_LARGE"
      ) {
        setQuotaState({
          errorCode: submitError.errorCode,
          generationType: quotaState.generationType,
          payload: compactPayload,
        });
        return;
      }

      setQuotaState(null);
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTokenResetRequest() {
    try {
      setIsSubmitting(true);
      setError("");
      await createTokenResetRequest({
        reason: "Token saya habis saat menggunakan fitur generate AI.",
      });
      setQuotaState(null);
      setError("Permintaan reset token berhasil dikirim ke admin.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isMounted) {
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
        message="Silakan login terlebih dahulu untuk menggunakan fitur generate AI."
        actionLabel="Login ke VibePlan AI"
        onAction={() => router.push("/login?redirect=/generate")}
      />
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl min-w-0 gap-6">
      <section className="relative w-full max-w-full min-w-0 overflow-hidden rounded-[2.5rem] border border-slate-200/70 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
          <div className="flex min-w-0 flex-col">
            <div>
              <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-sky-700 ring-1 ring-white/70">
                Generator Workspace
              </p>
              <h1 className="mt-4 max-w-4xl break-words text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Susun output AI yang lebih rapi sejak langkah pertama
              </h1>
              <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-slate-600 sm:text-base">
                Pilih jenis generate, siapkan konteks project yang dibutuhkan, lalu
                hasilkan dokumen yang lebih siap dipakai untuk planning maupun implementasi.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FlowChip
                step="01"
                title="Pilih Mode"
                description="Tentukan hasil yang ingin kamu buat."
              />
              <FlowChip
                step="02"
                title="Lengkapi Konteks"
                description="Isi form atau upload dokumen pendukung."
              />
              <FlowChip
                step="03"
                title="Generate"
                description="Dapatkan hasil yang siap dipakai dan disimpan."
              />
            </div>
          </div>

          <div className="flex w-full max-w-full min-w-0 lg:items-end">
            <ModeSummaryCard
              modeLabel={activeContext.badge}
              workflow={activeHint.workflow}
              outcome={activeHint.outcome}
              status={isSubmitting ? "Sedang diproses" : "Siap di-generate"}
            />
          </div>
        </div>
      </section>

      <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-900/5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-600">
              Langkah 1
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              Pilih jenis generate yang paling sesuai
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">
              Setiap mode dirancang untuk tahap kerja yang berbeda, jadi pilih alur
              yang paling mendekati kebutuhanmu saat ini.
            </p>
          </div>
          <div className="w-full max-w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 lg:max-w-sm">
            Pilih satu mode terlebih dahulu, lalu bagian setup di bawah akan menyesuaikan secara otomatis.
          </div>
        </div>
        <div className="mt-6">
          <GenerationTypeSelector
            value={generationType}
            onChange={setGenerationType}
          />
        </div>
      </section>

      <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-900/5 sm:p-6 lg:p-8">
        <div className="min-w-0 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-sky-700 ring-1 ring-sky-100">
              Langkah 2
            </p>
            <span className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-sky-700">
              {activeContext.badge}
            </span>
          </div>
          <h2 className="mt-4 max-w-full break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-[2rem]">
            {activeContext.title}
          </h2>
          <p className="mt-3 max-w-full break-words text-sm leading-7 text-slate-600 sm:text-base">
            {activeContext.description}
          </p>
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            {activeContext.helper}
          </div>
          <QuickGuidePanel />
        </div>

        <div className="mt-8 w-full max-w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50/60 p-3.5 sm:p-5">
          <GeneratorForm
            generationType={generationType}
            form={form}
            onChange={handleChange}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel={submitLabel}
            loadingLabel={loadingLabel}
            plannerAgent={plannerAgent}
            onPlannerAgentChange={setPlannerAgent}
            codingPromptAgent={codingPromptAgent}
            onCodingPromptAgentChange={setCodingPromptAgent}
            codingPromptGenerationMode={codingPromptGenerationMode}
            onCodingPromptGenerationModeChange={setCodingPromptGenerationMode}
            agentOptions={AGENT_OPTIONS}
            prdSourceMode={prdSourceMode}
            onPrdSourceModeChange={handlePrdSourceModeChange}
            nextStepGenerationMode={nextStepGenerationMode}
            onNextStepGenerationModeChange={setNextStepGenerationMode}
            onPrdFileChange={handlePrdFileChange}
            uploadedPrdFilename={uploadedPrdFilename}
            uploadedPrdPreview={uploadedPrdPreview}
            uploadedPrdFileSize={uploadedPrdFileSize}
            uploadedPrdCharCount={uploadedPrdCharCount}
            onNextStepFileChange={handleNextStepFileChange}
            uploadedNextStepFilename={uploadedNextStepFilename}
            uploadedNextStepPreview={uploadedNextStepPreview}
          />
        </div>
      </section>

      {quotaState?.errorCode === "PROVIDER_LIMIT" ? (
        <TokenLimitCard
          badge="Kuota Provider"
          helperText="Provider AI sedang mencapai batas sementara."
          title="Kuota AI Sedang Terbatas"
          body="Sistem sedang terkena batas kuota provider. Silakan coba Mode Ringkas, coba lagi nanti, atau hubungi admin."
          suggestions={[
            "Gunakan Mode Ringkas",
            "Coba lagi beberapa saat lagi",
            "Hubungi admin jika masalah terus berulang",
          ]}
          primaryActionLabel="Gunakan Mode Ringkas"
          onPrimaryAction={handleCompactRetry}
          onTertiaryAction={() => setQuotaState(null)}
          tertiaryActionLabel="Tutup"
          isLoading={isSubmitting}
          loadingLabel="Memproses Mode Ringkas..."
        />
      ) : null}

      {quotaState?.errorCode === "OUTPUT_TRUNCATED" ? (
        <TokenLimitCard
          badge="Output AI"
          helperText="Hasil generate melebihi batas output yang aman."
          title="Output Terlalu Panjang"
          body="Hasil AI terlalu panjang sehingga terpotong. Gunakan Mode Ringkas agar hasil lebih stabil."
          suggestions={[
            "Gunakan Mode Ringkas",
            "Kurangi isi PRD, roadmap, atau file input yang terlalu panjang",
            "Generate ulang setelah prompt diringkas",
          ]}
          primaryActionLabel="Gunakan Mode Ringkas"
          onPrimaryAction={handleCompactRetry}
          secondaryActionLabel="Kurangi Input"
          onSecondaryAction={() => {
            setQuotaState(null);
            setError("Kurangi isi input yang terlalu panjang, lalu coba generate lagi.");
          }}
          onTertiaryAction={() => setQuotaState(null)}
          tertiaryActionLabel="Tutup"
          isLoading={isSubmitting}
          loadingLabel="Memproses Mode Ringkas..."
        />
      ) : null}

      {quotaState?.errorCode === "INPUT_TOO_LARGE" ? (
        <TokenLimitCard
          badge="Input PRD"
          helperText="File upload melebihi ukuran konteks yang aman untuk mode normal."
          title="File PRD Terlalu Panjang"
          body="PRD yang kamu upload terlalu besar untuk diproses dalam mode normal."
          suggestions={[
            "Gunakan Mode Ringkas",
            "Upload file PRD yang lebih pendek atau lebih ringkas",
            "Kurangi bagian PRD yang terlalu detail jika tidak dibutuhkan",
          ]}
          primaryActionLabel="Gunakan Mode Ringkas"
          onPrimaryAction={handleCompactRetry}
          secondaryActionLabel="Upload File Lebih Pendek"
          onSecondaryAction={() => {
            setQuotaState(null);
            setError("Gunakan file PRD yang lebih pendek atau aktifkan Mode Ringkas sebelum generate ulang.");
          }}
          onTertiaryAction={() => setQuotaState(null)}
          tertiaryActionLabel="Tutup"
          isLoading={isSubmitting}
          loadingLabel="Memproses Mode Ringkas..."
        />
      ) : null}

      {quotaState?.errorCode === "TOKEN_EMPTY" ? (
        <TokenLimitCard
          badge="Token User"
          helperText={`Token saat ini: ${user?.token_balance ?? getUser()?.token_balance ?? 0}`}
          title="Token VibePlan AI Habis"
          body="Token kamu habis. Ajukan reset token ke admin agar bisa kembali menggunakan fitur generate AI."
          suggestions={[
            "Ajukan reset token ke admin",
            "Lihat paket token yang tersedia",
            "Tunggu sampai admin menambahkan token kembali",
          ]}
          primaryActionLabel="Ajukan Reset Token"
          onPrimaryAction={handleTokenResetRequest}
          secondaryActionLabel="Lihat Paket Token"
          onSecondaryAction={() => router.push("/pricing")}
          onTertiaryAction={() => setQuotaState(null)}
          tertiaryActionLabel="Tutup"
          isLoading={isSubmitting}
          loadingLabel="Mengirim permintaan..."
        />
      ) : null}

      {error ? <WorkspaceAlert message={error} /> : null}
    </div>
  );
}

function ModeSummaryCard({ modeLabel, workflow, outcome, status }) {
  return (
    <aside className="w-full max-w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
        Ringkasan Mode
      </p>
      <h3 className="mt-4 break-words text-xl font-black text-slate-950">
        {modeLabel}
      </h3>
      <p className="mt-2 break-words text-sm leading-6 text-slate-600">
        {workflow}
      </p>
      <div className="mt-5 grid gap-3">
        <MiniInfoPill label="Output" value={outcome} />
        <MiniInfoPill label="Status" value={status} />
      </div>
    </aside>
  );
}

function QuickGuidePanel() {
  return (
    <div className="mt-5 w-full max-w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
          Panduan Singkat
        </p>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-100">
          Tips
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <QuickTip
          title="Isi seperlunya"
          description="Fokus pada konteks penting agar hasil tetap terarah."
        />
        <QuickTip
          title="Pilih sumber yang tepat"
          description="Gunakan upload jika dokumen dasar sudah tersedia."
        />
        <QuickTip
          title="Mode Ringkas bila perlu"
          description="Pakai saat input cukup panjang atau butuh output padat."
        />
      </div>
    </div>
  );
}

async function submitGenerationRequest(generationType, payload, router) {
  const response = await generateContent(generationType, payload);
  const currentUser = getUser();

  if (currentUser) {
    updateStoredUser({
      ...currentUser,
      token_balance: Math.max(0, Number(currentUser.token_balance || 0) - 1),
    });
  }

  const generationId = getGenerationResponseId(response);

  if (!generationId) {
    console.log("Generate response without recognized ID:", response);
    throw new Error("ID hasil generate tidak ditemukan dari response backend.");
  }

  router.push(`/result/${generationId}`);
}

function buildNextStepPayload({
  form,
  prdSourceMode,
  uploadedPrdMarkdown,
  uploadedPrdFilename,
  plannerAgent,
  nextStepGenerationMode,
}) {
  const agentPayload = {
    agent_mode: plannerAgent === "auto" ? "auto" : "manual",
    selected_agent: plannerAgent === "auto" ? null : plannerAgent,
  };

  if (prdSourceMode === "upload") {
    if (!uploadedPrdMarkdown.trim()) {
      throw new Error("Upload file PRD .md atau .txt terlebih dahulu.");
    }

    return {
      prd_source_mode: "upload",
      prd_markdown: uploadedPrdMarkdown,
      uploaded_prd_filename: uploadedPrdFilename || null,
      generation_mode: nextStepGenerationMode,
      ...agentPayload,
    };
  }

  return {
    prd_source_mode: "form",
    generation_mode: nextStepGenerationMode,
    ...form,
    ...agentPayload,
  };
}

function buildCodingPromptPayload({
  uploadedNextStepMarkdown,
  uploadedNextStepFilename,
  codingPromptAgent,
  codingPromptGenerationMode,
}) {
  if (!uploadedNextStepMarkdown.trim()) {
    throw new Error("Upload file Next Step Planner .md atau .txt terlebih dahulu.");
  }

  return {
    prompt_source_mode: "next-step-upload",
    next_step_markdown: uploadedNextStepMarkdown,
    uploaded_next_step_filename: uploadedNextStepFilename || null,
    selected_agent: codingPromptAgent,
    generation_mode: codingPromptGenerationMode,
  };
}

function FlowChip({ step, title, description }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-700">
        {step}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 break-words text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function MiniInfoPill({ label, value }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900">
        {value}
      </p>
    </div>
  );
}

function QuickTip({ title, description }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-2xl bg-white px-4 py-3 shadow-sm shadow-slate-900/5 ring-1 ring-slate-100">
      <p className="break-words text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 break-words text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function WorkspaceAlert({ message }) {
  return (
    <div className="rounded-[2rem] border border-rose-200 bg-rose-50/90 p-5 shadow-sm shadow-rose-900/5">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-700">
        Perlu Diperhatikan
      </p>
      <p className="mt-3 text-sm leading-7 text-rose-700 sm:text-base">
        {message}
      </p>
    </div>
  );
}
