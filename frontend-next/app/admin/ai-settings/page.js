"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import LoadingState from "@/components/common/LoadingState";
import {
  getAdminAiDiagnostics,
  getAdminAiModels,
  getAdminAiSettings,
  updateAdminAiKey,
  validateAdminAiKey,
} from "@/lib/api";
import { getUser, subscribeAuthChange } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

const CARD_CLASS =
  "w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-900/5 sm:p-6";
const INPUT_CLASS =
  "block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200";

const PROVIDER_OPTIONS = [
  { value: "gemini", label: "Google AI Studio / Gemini" },
  { value: "groq", label: "Groq" },
  { value: "openrouter", label: "OpenRouter" },
];

const DEFAULT_GEMINI_TEXT_MODEL_OPTIONS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", note: "Cepat dan stabil untuk generate dokumen.", recommended: true },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", note: "Fallback ringan untuk traffic tinggi.", recommended: true },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", note: "Lebih kuat untuk output kompleks jika akses tersedia.", recommended: false },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", note: "Model text cepat generasi sebelumnya.", recommended: false },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", note: "Alternatif ringan generasi sebelumnya.", recommended: false },
  { value: "gemini-flash-latest", label: "Gemini Flash Latest", note: "Alias latest untuk lini Flash.", recommended: true },
  { value: "gemini-flash-lite-latest", label: "Gemini Flash-Lite Latest", note: "Alias latest untuk lini Flash Lite.", recommended: true },
  { value: "gemini-pro-latest", label: "Gemini Pro Latest", note: "Alias latest untuk lini Pro.", recommended: false },
  { value: "gemma-4-31b-it", label: "Gemma 4 31B", note: "Lebih berat, cocok sebagai opsi tambahan jika stabil.", recommended: true },
  { value: "gemma-4-26b-a4b-it", label: "Gemma 4 26B A4B", note: "Alternatif Gemma yang sedikit lebih ringan.", recommended: true },
];

const MODEL_SUGGESTIONS = {
  gemini: DEFAULT_GEMINI_TEXT_MODEL_OPTIONS.map((item) => item.value),
  groq: [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "deepseek-r1-distill-llama-70b",
    "qwen/qwen3-32b",
  ],
  openrouter: [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o-mini",
  ],
};

function normalizeFallbackModelsInput(value) {
  return Array.from(
    new Set(
      String(value || "")
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function fallbackModelsToText(fallbackModels) {
  return Array.isArray(fallbackModels) ? fallbackModels.join("\n") : "";
}

export default function AdminAiSettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [provider, setProvider] = useState("gemini");
  const [primaryModel, setPrimaryModel] = useState("");
  const [availableGeminiModels, setAvailableGeminiModels] = useState(DEFAULT_GEMINI_TEXT_MODEL_OPTIONS);
  const [fallbackModelsText, setFallbackModelsText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = user?.role === "admin";

  const providerSuggestions = useMemo(() => MODEL_SUGGESTIONS[provider] || [], [provider]);
  const geminiModelMap = useMemo(
    () => Object.fromEntries(availableGeminiModels.map((item) => [item.value, item])),
    [availableGeminiModels],
  );
  const selectedGeminiModel = provider === "gemini" ? geminiModelMap[primaryModel] || null : null;

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

    return subscribeAuthChange(syncUser);
  }, [isMounted]);

  const loadGeminiModels = useCallback(async (nextApiKey = "", preferredModel = "") => {
    try {
      const payload = await getAdminAiModels({
        provider: "gemini",
        ...(nextApiKey ? { api_key: nextApiKey } : {}),
      });
      const nextModels =
        Array.isArray(payload?.data) && payload.data.length > 0
          ? payload.data
          : DEFAULT_GEMINI_TEXT_MODEL_OPTIONS;

      setAvailableGeminiModels(nextModels);

      setPrimaryModel((currentValue) => {
        const targetModel = preferredModel || currentValue;

        if (targetModel && nextModels.some((item) => item.value === targetModel)) {
          return targetModel;
        }

        return nextModels[0]?.value || "";
      });
    } catch {
      setAvailableGeminiModels(DEFAULT_GEMINI_TEXT_MODEL_OPTIONS);

      setPrimaryModel((currentValue) => {
        if (DEFAULT_GEMINI_TEXT_MODEL_OPTIONS.some((item) => item.value === currentValue)) {
          return currentValue;
        }

        return DEFAULT_GEMINI_TEXT_MODEL_OPTIONS[0]?.value || "";
      });
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const payload = await getAdminAiSettings();
      const diagnosticsPayload = await getAdminAiDiagnostics();
      const nextSettings = payload?.data || null;
      const nextDiagnostics = diagnosticsPayload?.data || null;
      const runtimeProvider = nextDiagnostics?.provider || nextSettings?.provider || "gemini";
      const runtimeModel = nextDiagnostics?.model || nextSettings?.model || "";
      const runtimeFallbackModels =
        nextDiagnostics?.fallback_models || nextSettings?.fallback_models || [];

      setSettings(nextSettings);
      setDiagnostics(nextDiagnostics);
      setProvider(runtimeProvider);
      setFallbackModelsText(fallbackModelsToText(runtimeFallbackModels));

      if (runtimeProvider === "gemini") {
        await loadGeminiModels("", runtimeModel);
      } else {
        setPrimaryModel(runtimeModel || MODEL_SUGGESTIONS[runtimeProvider]?.[0] || "");
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [loadGeminiModels]);

  useEffect(() => {
    if (!isMounted || !isAdmin) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, isMounted, loadSettings]);

  async function handleValidate() {
    try {
      setIsSubmitting(true);
      setStatus("");
      setError("");
      const payload = await validateAdminAiKey({
        provider,
        api_key: apiKey,
        primary_model: primaryModel,
        fallback_models: normalizeFallbackModelsInput(fallbackModelsText),
      });
      setStatus(payload?.message || "Konfigurasi valid.");
    } catch (submitError) {
      setError(getAiSettingsErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave() {
    try {
      setIsSubmitting(true);
      setStatus("");
      setError("");
      const payload = await updateAdminAiKey({
        provider,
        api_key: apiKey,
        primary_model: primaryModel,
        fallback_models: normalizeFallbackModelsInput(fallbackModelsText),
      });
      setStatus(payload?.message || "Konfigurasi AI berhasil diperbarui.");
      setApiKey("");
      await loadSettings();
    } catch (submitError) {
      setError(getAiSettingsErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
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
        message="Silakan login dengan akun admin untuk membuka AI Settings."
        actionLabel={user ? "Kembali ke Home" : "Login Admin"}
        onAction={() => {
          window.location.href = user ? "/" : "/login?redirect=/admin/ai-settings";
        }}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-white via-sky-50/70 to-indigo-50/65 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
              Admin AI Settings
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Admin AI Settings
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Kelola provider AI, model utama, daftar fallback model, base URL, dan validasi API
              key untuk kebutuhan generate dokumen.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Google AI Studio Ready
            </p>
            <div className="mt-4 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-7 text-sky-800">
              Untuk Gemini, daftar model utama sekarang diambil langsung dari Google AI Studio key
              aktif dan difilter hanya untuk model teks yang cocok untuk generator dokumen.
            </div>
          </div>
        </div>
      </section>

      {status ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {status}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState
          title="Memuat AI settings..."
          description="Konfigurasi provider dan diagnostics sedang disiapkan."
        />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <div className={CARD_CLASS}>
              <SectionHeader
                badge="Current Config"
                title="Konfigurasi aktif"
                description="Ringkasan provider, model utama, dan fallback model yang saat ini dipakai backend."
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoRow label="Provider" value={settings?.provider || "gemini"} />
                <InfoRow label="Model utama" value={settings?.model || "-"} />
                <InfoRow label="Base URL" value={settings?.base_url || "-"} />
                <InfoRow label="Masked API Key" value={settings?.masked_api_key || "Belum ada"} />
              </div>

              <div className="mt-3">
                <InfoRow label="Fallback models" value={formatFallbackModels(settings?.fallback_models)} />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <SectionHeader
                badge="Diagnostics"
                title="Runtime diagnostics"
                description="Pastikan runtime backend memakai provider, model, fallback model, dan API key yang diharapkan."
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoRow label="Provider runtime" value={diagnostics?.provider || "-"} />
                <InfoRow label="Model runtime" value={diagnostics?.model || "-"} />
                <InfoRow label="Base URL runtime" value={diagnostics?.base_url || "-"} />
                <InfoRow label="Masked env API key" value={diagnostics?.masked_env_api_key || "Belum ada"} />
                <InfoRow label="Masked runtime API key" value={diagnostics?.masked_runtime_api_key || "Belum ada"} />
              </div>

              <div className="mt-3">
                <InfoRow label="Fallback runtime" value={formatFallbackModels(diagnostics?.fallback_models)} />
              </div>

              {diagnostics?.runtime_key_mismatch ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Laravel runtime masih memakai key berbeda. Jalankan config clear dan restart backend.
                </div>
              ) : null}
            </div>
          </section>

          <section className={CARD_CLASS}>
            <SectionHeader
              badge="Update API Key"
              title="Validasi dan perbarui API key"
              description="Atur provider, model utama, dan model cadangan untuk proses generate dokumen."
            />

            <div className="mt-5 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">
              <p className="font-semibold text-sky-900">Alur singkat</p>
              <p className="mt-2 leading-7">
                Pilih provider, tentukan model utama, tambahkan model cadangan bila perlu, lalu
                validasi sebelum menyimpan.
              </p>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
              <label className="grid gap-2 self-start">
                <span className="text-sm font-medium text-slate-700">Provider</span>
                <select
                  value={provider}
                  onChange={(event) => {
                    const nextProvider = event.target.value;
                    const nextSuggestions = MODEL_SUGGESTIONS[nextProvider] || [];

                    setProvider(nextProvider);

                    if (nextProvider === "gemini") {
                      void loadGeminiModels(apiKey);
                    } else if (!nextSuggestions.includes(primaryModel) && nextSuggestions[0]) {
                      setPrimaryModel(nextSuggestions[0]);
                    }
                  }}
                  className={INPUT_CLASS}
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-6 text-slate-500">
                  Pilih layanan AI yang aktif untuk backend.
                </p>
              </label>

              <label className="grid gap-3 self-start">
                <span className="text-sm font-medium text-slate-700">Model utama</span>
                {provider === "gemini" ? (
                  <>
                    <select
                      value={primaryModel}
                      onChange={(event) => setPrimaryModel(event.target.value)}
                      className={INPUT_CLASS}
                    >
                      {availableGeminiModels.map((modelOption) => (
                        <option key={modelOption.value} value={modelOption.value}>
                          {modelOption.label}
                          {modelOption.recommended ? " - Recommended" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs leading-6 text-slate-500">
                      Dropdown ini dimuat dari Google AI Studio key aktif dan hanya menampilkan model
                      teks yang cocok untuk PRD, Next Step Planner, dan Coding Prompt.
                    </p>
                    {selectedGeminiModel ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700">
                        <span className="font-semibold text-slate-900">{selectedGeminiModel.label}</span>
                        {" - "}
                        {selectedGeminiModel.note}
                      </div>
                    ) : null}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                      Model yang paling aman untuk key Anda saat ini:
                      {" "}
                      <span className="font-semibold">
                        Gemini 2.5 Flash, Gemini 2.5 Flash Lite, Gemini Flash Latest,
                        Gemini Flash-Lite Latest, Gemma 4 31B, dan Gemma 4 26B A4B.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      list={`ai-model-suggestions-${provider}`}
                      type="text"
                      value={primaryModel}
                      onChange={(event) => setPrimaryModel(event.target.value)}
                      placeholder="Contoh: llama-3.1-8b-instant"
                      className={INPUT_CLASS}
                    />
                    <datalist id={`ai-model-suggestions-${provider}`}>
                      {providerSuggestions.map((modelName) => (
                        <option key={modelName} value={modelName} />
                      ))}
                    </datalist>
                  </>
                )}
              </label>

              <label className="grid gap-2 lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">Model cadangan</span>
                <textarea
                  value={fallbackModelsText}
                  onChange={(event) => setFallbackModelsText(event.target.value)}
                  placeholder={
                    provider === "gemini"
                      ? "Contoh:\ngemini-2.5-flash-lite\ngemini-2.0-flash"
                      : "Masukkan satu model per baris atau pisahkan dengan koma."
                  }
                  rows={4}
                  className={`${INPUT_CLASS} min-h-[120px] resize-y`}
                />
                <p className="text-xs leading-6 text-slate-500">
                  Backend akan mencoba model berikutnya secara berurutan jika model utama timeout,
                  high demand, atau tidak tersedia. Untuk Gemini, gunakan satu model per baris.
                </p>
                {provider === "gemini" ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Tambah cepat
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {availableGeminiModels.filter((item) => item.value !== primaryModel).map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            const nextFallbackModels = Array.from(
                              new Set([
                                ...normalizeFallbackModelsInput(fallbackModelsText),
                                item.value,
                              ]),
                            ).filter((value) => value !== primaryModel);

                            setFallbackModelsText(fallbackModelsToText(nextFallbackModels));
                          }}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          + {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </label>

              <label className="grid gap-2 lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">New API Key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Kosongkan jika hanya ingin mengganti model dan memakai key backend yang sudah aktif"
                  className={INPUT_CLASS}
                />
                <p className="text-xs leading-6 text-slate-500">
                  Isi hanya jika Anda ingin mengganti API key yang aktif.
                </p>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleValidate}
                disabled={isSubmitting || !provider || !primaryModel.trim()}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Memvalidasi..." : "Validate Configuration"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || !provider || !primaryModel.trim()}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Menyimpan..." : "Save / Update Configuration"}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionHeader({ badge, title, description }) {
  return (
    <div className="min-w-0">
      <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
        {badge}
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function formatFallbackModels(fallbackModels) {
  if (!Array.isArray(fallbackModels) || fallbackModels.length === 0) {
    return "Belum ada";
  }

  return fallbackModels.join(", ");
}

function getAiSettingsErrorMessage(error) {
  switch (error?.errorCode) {
    case "AI_KEY_INVALID":
      return "API key tidak valid, atau model yang dipilih memang tidak didukung untuk key/project ini.";
    case "AI_PROVIDER_UNREACHABLE":
      return "Provider AI sedang tidak bisa dijangkau atau model sedang high demand. Coba model fallback lain atau ulangi beberapa saat lagi.";
    case "MODEL_NOT_ALLOWED":
      return "Model yang dipilih tidak tersedia atau tidak diizinkan untuk project ini.";
    case "PROVIDER_LIMIT":
      return "Model ini terkena limit atau kuotanya tidak tersedia untuk project Anda. Gunakan model rekomendasi yang lebih aman.";
    default:
      return getErrorMessage(error);
  }
}
