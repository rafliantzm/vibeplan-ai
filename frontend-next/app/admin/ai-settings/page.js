"use client";

import { useEffect, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import {
  getAdminAiDiagnostics,
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

export default function AdminAiSettingsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [provider, setProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function loadSettings() {
    try {
      setIsLoading(true);
      setError("");
      const payload = await getAdminAiSettings();
      const diagnosticsPayload = await getAdminAiDiagnostics();
      setSettings(payload?.data || null);
      setDiagnostics(diagnosticsPayload?.data || null);
      setProvider(payload?.data?.provider || "groq");
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isMounted || !isAdmin) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isAdmin, isMounted]);

  async function handleValidate() {
    try {
      setIsSubmitting(true);
      setStatus("");
      setError("");
      const payload = await validateAdminAiKey({ provider, api_key: apiKey });
      setStatus(payload?.message || "API key valid.");
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
      const payload = await updateAdminAiKey({ provider, api_key: apiKey });
      setStatus(payload?.message || "API key berhasil diperbarui.");
      setSettings(payload?.data || null);
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

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
              Admin AI Settings
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Admin AI Settings
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Kelola provider AI, model, base URL, dan validasi API key untuk kebutuhan generate dokumen.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Security Note
            </p>
            <div className="mt-4 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-7 text-sky-800">
              API key hanya disimpan di backend dan tidak ditampilkan secara penuh.
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
                description="Ringkasan provider yang saat ini dipakai oleh backend untuk generate dokumen."
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoRow label="Provider" value={settings?.provider || "groq"} />
                <InfoRow label="Model" value={settings?.model || "-"} />
                <InfoRow label="Base URL" value={settings?.base_url || "-"} />
                <InfoRow label="Masked API Key" value={settings?.masked_api_key || "Belum ada"} />
              </div>
            </div>

            <div className={CARD_CLASS}>
              <SectionHeader
                badge="Diagnostics"
                title="Runtime diagnostics"
                description="Bantu admin memastikan runtime backend memakai provider, model, dan API key yang diharapkan."
              />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoRow label="Provider runtime" value={diagnostics?.provider || "-"} />
                <InfoRow label="Model runtime" value={diagnostics?.model || "-"} />
                <InfoRow label="Base URL runtime" value={diagnostics?.base_url || "-"} />
                <InfoRow
                  label="Masked env API key"
                  value={diagnostics?.masked_env_api_key || "Belum ada"}
                />
                <InfoRow
                  label="Masked runtime API key"
                  value={diagnostics?.masked_runtime_api_key || "Belum ada"}
                />
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
              description="Gunakan langkah ini untuk menguji key baru terlebih dahulu, lalu simpan ke backend jika sudah valid."
            />

            <div className="mt-5 rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-7 text-sky-800">
              1. Pilih provider. 2. Masukkan API key baru. 3. Validasi terlebih dahulu. 4. Simpan hanya jika hasil valid.
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Provider</span>
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="groq">Groq</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">New API Key</span>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Masukkan API key baru"
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleValidate}
                disabled={isSubmitting || !apiKey}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Memvalidasi..." : "Validate Key"}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || !apiKey}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Menyimpan..." : "Save / Update Key"}
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
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function getAiSettingsErrorMessage(error) {
  switch (error?.errorCode) {
    case "AI_KEY_INVALID":
      return "API key tidak valid atau tidak memiliki akses model.";
    case "AI_PROVIDER_UNREACHABLE":
      return "Provider AI sedang tidak bisa dijangkau.";
    case "MODEL_NOT_ALLOWED":
      return "API key valid, tetapi model tidak diizinkan pada project Groq ini.";
    case "PROVIDER_LIMIT":
      return "Provider AI sedang terkena limit. Coba lagi nanti atau gunakan mode ringkas.";
    default:
      return getErrorMessage(error);
  }
}
