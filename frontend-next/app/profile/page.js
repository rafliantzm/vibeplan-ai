"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import LoadingState from "@/components/common/LoadingState";
import {
  getProfile,
  updatePassword,
  updateProfile,
  updateProfileName,
  uploadProfileAvatar,
} from "@/lib/api";
import { getUser, subscribeAuthChange } from "@/lib/auth";
import { formatDate, getErrorMessage } from "@/lib/utils";

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const CARD_BASE_CLASS =
  "w-full max-w-full min-w-0 rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur";
const SOFT_PANEL_CLASS =
  "rounded-[1.75rem] border border-slate-200/80 bg-slate-50/75 p-4 shadow-sm shadow-slate-900/5";
const INPUT_CLASS =
  "block w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none focus:outline-none focus:ring-4 focus:ring-sky-100";
const GRADIENT_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none focus:outline-none focus:ring-4 focus:ring-sky-100";
const OUTLINE_BUTTON_CLASS =
  "rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:border-sky-200 hover:bg-sky-50 focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400";

export default function ProfilePage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [quickNameForm, setQuickNameForm] = useState({ name: "" });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isQuickNameSubmitting, setIsQuickNameSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [quickNameStatus, setQuickNameStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [avatarStatus, setAvatarStatus] = useState("");
  const [avatarError, setAvatarError] = useState("");

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
    return () => {
      if (avatarPreviewUrl) {
        window.URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await getProfile();
      const nextProfile = response?.data || null;
      setProfile(nextProfile);
      hydrateForms(nextProfile, setProfileForm, setQuickNameForm);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isMounted || !user) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMounted, user, loadProfile]);

  const currentProfile = profile || user;
  const avatarSrc = avatarPreviewUrl || currentProfile?.avatar_url || "";
  const avatarMeta = useMemo(() => {
    if (!selectedAvatarFile) {
      return null;
    }

    return {
      name: selectedAvatarFile.name,
      sizeLabel: formatFileSize(selectedAvatarFile.size),
    };
  }, [selectedAvatarFile]);

  function handleProfileChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  function handleQuickNameChange(event) {
    setQuickNameForm({ name: event.target.value });
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  }

  function handleAvatarFileChange(event) {
    const file = event.target.files?.[0];
    setAvatarStatus("");
    setAvatarError("");

    if (!file) {
      resetAvatarSelection();
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      resetAvatarSelection();
      setAvatarError("Format gambar tidak didukung.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      resetAvatarSelection();
      setAvatarError("Ukuran gambar maksimal 2MB.");
      return;
    }

    if (avatarPreviewUrl) {
      window.URL.revokeObjectURL(avatarPreviewUrl);
    }

    setSelectedAvatarFile(file);
    setAvatarPreviewUrl(window.URL.createObjectURL(file));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    try {
      setIsProfileSubmitting(true);
      setError("");
      setProfileStatus("");
      const response = await updateProfile(profileForm);
      const nextProfile = response?.data || null;
      applyProfileUpdate(nextProfile);
      setProfileStatus("Profil berhasil diperbarui.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsProfileSubmitting(false);
    }
  }

  async function handleQuickNameSubmit(event) {
    event.preventDefault();

    try {
      setIsQuickNameSubmitting(true);
      setError("");
      setQuickNameStatus("");
      const response = await updateProfileName(quickNameForm);
      const nextProfile = response?.data || null;
      applyProfileUpdate(nextProfile);
      setQuickNameStatus("Nama berhasil diperbarui.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsQuickNameSubmitting(false);
    }
  }

  async function handleAvatarSubmit(event) {
    event.preventDefault();

    if (!selectedAvatarFile) {
      setAvatarError("Pilih gambar profil terlebih dahulu.");
      return;
    }

    try {
      setIsAvatarSubmitting(true);
      setError("");
      setAvatarError("");
      setAvatarStatus("");
      const response = await uploadProfileAvatar(selectedAvatarFile);
      const nextProfile = response?.data || null;
      applyProfileUpdate(nextProfile);
      resetAvatarSelection();
      setAvatarStatus("Foto profil berhasil diperbarui.");
    } catch (submitError) {
      const nextMessage = submitError?.status === 422
        ? submitError?.userMessage || submitError?.message || "Foto profil gagal diunggah."
        : "Foto profil gagal diunggah.";
      setAvatarError(nextMessage);
    } finally {
      setIsAvatarSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    try {
      setIsPasswordSubmitting(true);
      setError("");
      setPasswordStatus("");
      await updatePassword(passwordForm);
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
      setPasswordStatus("Password berhasil diperbarui.");
    } catch (submitError) {
      if (submitError?.errorCode === "CURRENT_PASSWORD_INVALID") {
        setError("Password lama tidak sesuai.");
      } else {
        setError(getErrorMessage(submitError));
      }
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  function applyProfileUpdate(nextProfile) {
    setProfile(nextProfile);
    hydrateForms(nextProfile, setProfileForm, setQuickNameForm);
    setUser(getUser());
  }

  function resetAvatarSelection() {
    if (avatarPreviewUrl) {
      window.URL.revokeObjectURL(avatarPreviewUrl);
    }

    setSelectedAvatarFile(null);
    setAvatarPreviewUrl("");
  }

  if (!isMounted) {
    return (
      <LoadingState
        title="Memeriksa sesi profil..."
        description="Mohon tunggu, status akun sedang disiapkan."
      />
    );
  }

  if (!user) {
    return (
      <LoginRequiredCard
        title="Login Diperlukan"
        message="Silakan login terlebih dahulu untuk membuka halaman profil."
        actionLabel="Login ke VibePlan AI"
        onAction={() => {
          window.location.href = "/login?redirect=/profile";
        }}
      />
    );
  }

  if (isLoading && !profile) {
    return (
      <LoadingState
        title="Memuat profil..."
        description="Data akun kamu sedang diambil dari backend Laravel."
      />
    );
  }

  return (
    <div className="relative mx-auto grid w-full max-w-7xl min-w-0 gap-6 py-8 sm:py-10">
      <ProfileHero currentProfile={currentProfile} />

      {error ? <MessageBanner tone="error">{error}</MessageBanner> : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="grid gap-6 lg:col-span-7">
          <ProfileOverviewCard currentProfile={currentProfile} />
          <ProfileAccountFormCard
            profileForm={profileForm}
            onChange={handleProfileChange}
            onSubmit={handleProfileSubmit}
            isSubmitting={isProfileSubmitting}
            statusMessage={profileStatus}
          />
        </div>

        <div className="grid gap-6 lg:col-span-5">
          <ProfileIdentityCard
            currentProfile={currentProfile}
            avatarSrc={avatarSrc}
          />
          <ProfileAvatarUploadCard
            avatarSrc={avatarSrc}
            currentProfile={currentProfile}
            avatarMeta={avatarMeta}
            onAvatarFileChange={handleAvatarFileChange}
            onSubmit={handleAvatarSubmit}
            isSubmitting={isAvatarSubmitting}
            hasSelectedAvatar={Boolean(selectedAvatarFile)}
            statusMessage={avatarStatus}
            errorMessage={avatarError}
          />
          <ProfileDisplayNameCard
            quickNameForm={quickNameForm}
            onChange={handleQuickNameChange}
            onSubmit={handleQuickNameSubmit}
            isSubmitting={isQuickNameSubmitting}
            statusMessage={quickNameStatus}
          />
          <ProfileStatsCards currentProfile={currentProfile} />
        </div>
      </div>

      <ProfilePasswordCard
        passwordForm={passwordForm}
        onChange={handlePasswordChange}
        onSubmit={handlePasswordSubmit}
        isSubmitting={isPasswordSubmitting}
        statusMessage={passwordStatus}
      />
    </div>
  );
}

function ProfileHero({ currentProfile }) {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-white via-sky-50 to-indigo-50 p-7 shadow-[0_18px_50px_rgba(15,23,42,0.07)] md:p-9">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />
      <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <div>
          <p className="inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-sky-700">
            Profil
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-4xl">
            Profil Saya
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
            Kelola identitas akun, avatar, keamanan akses, dan informasi penggunaan token dalam satu tempat.
          </p>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Account Workspace
          </p>
          <div className="mt-4 rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
              Token Balance
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              {currentProfile?.token_balance ?? 0}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Siap dipakai untuk generate dokumen AI berikutnya.
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            <SummaryRow label="Role" value={formatRoleLabel(currentProfile?.role)} />
            <SummaryRow label="Status" value={formatStatusLabel(currentProfile?.status)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <BadgeChip tone={currentProfile?.status === "blocked" ? "rose" : "emerald"}>
              {formatStatusLabel(currentProfile?.status)}
            </BadgeChip>
            <BadgeChip tone="slate">{formatRoleLabel(currentProfile?.role)}</BadgeChip>
            <BadgeChip tone="sky">{currentProfile?.token_balance ?? 0} Tokens</BadgeChip>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileOverviewCard({ currentProfile }) {
  return (
    <section className={CARD_BASE_CLASS}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <AvatarDisplay
            src={currentProfile?.avatar_url}
            name={currentProfile?.name}
            sizeClass="h-20 w-20 text-2xl"
          />
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-950">
              {currentProfile?.name || "User"}
            </h2>
            <p className="mt-1 break-words text-sm text-slate-500">
              {currentProfile?.email || "-"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <BadgeChip tone={currentProfile?.status === "blocked" ? "rose" : "emerald"}>
                {formatStatusLabel(currentProfile?.status)}
              </BadgeChip>
              <BadgeChip tone="slate">{formatRoleLabel(currentProfile?.role)}</BadgeChip>
            </div>
          </div>
        </div>

        <div className="grid w-full gap-3 sm:max-w-[240px]">
          <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
              Token Tersedia
            </p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {currentProfile?.token_balance ?? 0}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Digunakan untuk generate dokumen AI.
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Status Akun
            </p>
            <p className="mt-3 text-lg font-black text-slate-950">
              {formatStatusLabel(currentProfile?.status)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {currentProfile?.status === "blocked"
                ? "Akun sedang dibatasi sementara."
                : "Akun siap digunakan kapan saja."}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-slate-600">
        Ringkasan ini membantu kamu melihat data inti akun dengan cepat sebelum melakukan perubahan pada identitas, avatar, atau keamanan akses.
      </p>

      <div className="mt-6 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
        <InfoFact label="Nama" value={currentProfile?.name || "-"} />
        <InfoFact label="Email" value={currentProfile?.email || "-"} />
        <InfoFact label="Role" value={formatRoleLabel(currentProfile?.role)} />
        <InfoFact label="Token Tersisa" value={`${currentProfile?.token_balance ?? 0}`} />
        <InfoFact label="Status" value={formatStatusLabel(currentProfile?.status)} />
        <InfoFact
          label="Akun Dibuat"
          value={currentProfile?.created_at ? formatDate(currentProfile.created_at) : "-"}
        />
      </div>
    </section>
  );
}

function ProfileAccountFormCard({
  profileForm,
  onChange,
  onSubmit,
  isSubmitting,
  statusMessage,
}) {
  return (
    <section className={CARD_BASE_CLASS}>
      <SectionHeader
        badge="Data Akun"
        title="Perbarui nama dan email utama"
        description="Gunakan data utama akun yang benar agar identitasmu tetap mudah dikenali dan aman digunakan."
      />

      <div className={`${SOFT_PANEL_CLASS} mt-5`}>
        <p className="text-sm font-semibold text-slate-900">
          Data ini dipakai sebagai identitas utama akun
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Nama dan email utama membantu admin maupun sistem mengenali akun kamu dengan lebih akurat saat login, reset, atau verifikasi.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nama"
            name="name"
            value={profileForm.name}
            onChange={onChange}
            required
          />
          <Field
            label="Email"
            name="email"
            type="email"
            value={profileForm.email}
            onChange={onChange}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-5 w-full md:w-auto ${PRIMARY_BUTTON_CLASS}`}
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>

      {statusMessage ? <MessageBanner tone="success" className="mt-4">{statusMessage}</MessageBanner> : null}
    </section>
  );
}

function ProfileIdentityCard({ currentProfile, avatarSrc }) {
  return (
    <section className={CARD_BASE_CLASS}>
      <SectionHeader
        badge="Identitas Profil"
        title="Identitas Akun"
        description="Informasi ini membantu mengenali akun kamu di VibePlan AI."
      />

      <div className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-indigo-50 p-6 text-center shadow-inner">
        <div className="flex flex-col items-center">
          <AvatarDisplay
            src={avatarSrc}
            name={currentProfile?.name}
            sizeClass="h-24 w-24 text-4xl"
          />
          <h2 className="mt-4 text-2xl font-black text-slate-950">
            {currentProfile?.name || "User"}
          </h2>
          <p className="mt-1 break-words text-sm text-slate-500">
            {currentProfile?.email || "-"}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
            Tampilan ini mewakili identitas akun kamu di area profil dan membantu menjaga profil tetap terasa personal.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <BadgeChip tone="slate">{formatRoleLabel(currentProfile?.role)}</BadgeChip>
            <BadgeChip tone={currentProfile?.status === "blocked" ? "rose" : "emerald"}>
              {formatStatusLabel(currentProfile?.status)}
            </BadgeChip>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileAvatarUploadCard({
  avatarSrc,
  currentProfile,
  avatarMeta,
  onAvatarFileChange,
  onSubmit,
  isSubmitting,
  hasSelectedAvatar,
  statusMessage,
  errorMessage,
}) {
  return (
    <section className={CARD_BASE_CLASS}>
      <SectionHeader
        badge="Ganti Foto Profil"
        title="Unggah avatar baru"
        description="Gunakan gambar JPG, PNG, atau WebP maksimal 2MB agar tampilan akun tetap rapi dan profesional."
      />

      <form onSubmit={onSubmit} className="mt-5 grid min-w-0 gap-5">
        <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)] lg:items-start">
          <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Preview Avatar
            </p>
            <div className="mt-4 flex justify-center">
              <AvatarDisplay src={avatarSrc} name={currentProfile?.name} sizeClass="h-24 w-24 text-3xl" />
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Foto ini akan tampil di profil dan area header akun.
            </p>
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="rounded-[1.5rem] border border-dashed border-sky-200 bg-sky-50/50 p-4">
              <label className="grid min-w-0 gap-3">
                <span className="text-sm font-medium text-slate-700">
                  Pilih gambar profil
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={onAvatarFileChange}
                  className="block w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-3 file:max-w-full file:rounded-2xl file:border-0 file:bg-slate-950 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-slate-800"
                />
              </label>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Pilih foto yang jelas dan proporsional agar identitas akun lebih mudah dikenali.
              </p>
            </div>

            {avatarMeta ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <p className="font-medium text-slate-800">{avatarMeta.name}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  {avatarMeta.sizeLabel}
                </p>
              </div>
            ) : (
              <div className={`${SOFT_PANEL_CLASS} py-3`}>
                <p className="text-sm leading-6 text-slate-600">
                  Belum ada file baru yang dipilih. Kamu tetap bisa melihat avatar saat ini di preview sebelah kiri.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !hasSelectedAvatar}
          className={`w-full ${GRADIENT_BUTTON_CLASS}`}
        >
          {isSubmitting ? "Mengunggah..." : "Simpan Foto Profil"}
        </button>
      </form>

      {statusMessage ? <MessageBanner tone="success" className="mt-4">{statusMessage}</MessageBanner> : null}
      {errorMessage ? <MessageBanner tone="error" className="mt-4">{errorMessage}</MessageBanner> : null}
    </section>
  );
}

function ProfileDisplayNameCard({
  quickNameForm,
  onChange,
  onSubmit,
  isSubmitting,
  statusMessage,
}) {
  return (
    <section className={CARD_BASE_CLASS}>
      <SectionHeader
        badge="Nama Tampilan"
        title="Nama Tampilan Cepat"
        description="Gunakan update cepat ini saat kamu hanya ingin mengganti nama yang tampil tanpa mengubah data akun lain."
      />

      <div className="mt-5 rounded-[1.75rem] border border-sky-100 bg-gradient-to-br from-sky-50/80 to-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">
          Quick action untuk area header
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Nama tampilan ini akan lebih sering terlihat di header dan area identitas akun kamu.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <Field
          label="Nama Tampilan"
          name="quick_name"
          value={quickNameForm.name}
          onChange={onChange}
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${OUTLINE_BUTTON_CLASS} w-full sm:w-auto`}
        >
          {isSubmitting ? "Memperbarui..." : "Update Nama"}
        </button>
      </form>

      {statusMessage ? <MessageBanner tone="success" className="mt-4">{statusMessage}</MessageBanner> : null}
    </section>
  );
}

function ProfileStatsCards({ currentProfile }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MiniStatCard
        label="Status Akun"
        value={formatStatusLabel(currentProfile?.status)}
        caption={
          currentProfile?.status === "blocked"
            ? "Akun sedang dibatasi sementara."
            : "Akun aktif dan siap digunakan untuk semua fitur utama."
        }
        tone={currentProfile?.status === "blocked" ? "rose" : "emerald"}
      />
      <MiniStatCard
        label="Token Saat Ini"
        value={`${currentProfile?.token_balance ?? 0} Tokens`}
        caption="Dipakai saat kamu membuat PRD, roadmap, atau coding prompt."
        tone="sky"
      />
    </div>
  );
}

function ProfilePasswordCard({
  passwordForm,
  onChange,
  onSubmit,
  isSubmitting,
  statusMessage,
}) {
  return (
    <section className={CARD_BASE_CLASS}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div>
          <SectionHeader
            badge="Keamanan Akun"
            title="Perbarui sandi akun"
            description="Gunakan password lama untuk verifikasi, lalu ganti dengan password baru yang lebih aman dan mudah kamu ingat."
          />
        </div>
        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
            Tips Password Aman
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.
          </p>
        </div>
      </div>

      <div className={`${SOFT_PANEL_CLASS} mt-5`}>
        <p className="text-sm font-semibold text-slate-900">
          Langkah keamanan yang sederhana
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Isi password lama untuk verifikasi, lalu pastikan password baru berbeda dan mudah kamu simpan dengan aman.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Field
            label="Password Lama"
            name="current_password"
            type="password"
            value={passwordForm.current_password}
            onChange={onChange}
            required
          />
          <Field
            label="Password Baru"
            name="new_password"
            type="password"
            value={passwordForm.new_password}
            onChange={onChange}
            required
          />
          <Field
            label="Konfirmasi Password Baru"
            name="new_password_confirmation"
            type="password"
            value={passwordForm.new_password_confirmation}
            onChange={onChange}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`mt-5 ${GRADIENT_BUTTON_CLASS}`}
        >
          {isSubmitting ? "Memperbarui..." : "Ganti Password"}
        </button>
      </form>

      {statusMessage ? <MessageBanner tone="success" className="mt-4">{statusMessage}</MessageBanner> : null}
    </section>
  );
}

function SectionHeader({ badge, title, description }) {
  return (
    <>
      <p className="inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-sky-700">
        {badge}
      </p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
        {description}
      </p>
    </>
  );
}

function MessageBanner({ children, tone = "info", className = "" }) {
  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${toneClass} ${className}`.trim()}>
      {children}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <input
        {...props}
        className={INPUT_CLASS}
      />
    </label>
  );
}

function InfoFact({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MiniStatCard({ label, value, caption, tone = "slate" }) {
  const toneClass = {
    slate: "border-slate-200 bg-gradient-to-br from-slate-50 to-white",
    sky: "border-sky-200 bg-gradient-to-br from-sky-50 to-white",
    emerald: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
    rose: "border-rose-200 bg-gradient-to-br from-rose-50 to-white",
  }[tone];

  return (
    <div className={`rounded-[1.75rem] border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{caption}</p>
    </div>
  );
}

function BadgeChip({ children, tone = "slate" }) {
  const toneClass = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${toneClass}`}>
      {children}
    </span>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="min-w-0 break-words text-right text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function AvatarDisplay({ src, name, sizeClass = "h-16 w-16 text-xl" }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Avatar ${name || "user"}`}
        className={`${sizeClass} rounded-[2rem] object-cover shadow-lg ring-4 ring-white shadow-slate-900/10`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,_#0f172a,_#4338ca,_#0ea5e9)] font-semibold text-white shadow-lg ring-4 ring-white shadow-slate-900/15 ${sizeClass}`}
    >
      {getUserInitial(name)}
    </div>
  );
}

function hydrateForms(nextProfile, setProfileForm, setQuickNameForm) {
  setProfileForm({
    name: nextProfile?.name || "",
    email: nextProfile?.email || "",
  });
  setQuickNameForm({
    name: nextProfile?.name || "",
  });
}

function formatFileSize(bytes) {
  if (!bytes || Number.isNaN(bytes)) {
    return "0 KB";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getUserInitial(name) {
  if (!name || typeof name !== "string") {
    return "V";
  }

  return name.trim().charAt(0).toUpperCase() || "V";
}

function formatRoleLabel(role) {
  return role === "admin" ? "Admin" : "Member";
}

function formatStatusLabel(status) {
  return status === "blocked" ? "Blocked" : "Active";
}
