"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import LoadingState from "@/components/common/LoadingState";
import { getUser, subscribeAuthChange } from "@/lib/auth";

export default function AdminPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);

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

  const isAdmin = user?.role === "admin";

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
        message="Silakan login dengan akun admin untuk membuka dashboard admin."
        actionLabel={user ? "Kembali ke Home" : "Login Admin"}
        onAction={() => {
          window.location.href = user ? "/" : "/login?redirect=/admin";
        }}
      />
    );
  }

  return (
    <div className="grid w-full max-w-full gap-6">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-white via-sky-50/75 to-indigo-50/70 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Dashboard Admin VibePlan AI
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Kelola konfigurasi AI, token request, live chat support, dan data user dalam satu workspace.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Admin Workspace
            </p>
            <div className="mt-4 grid gap-3">
              <OverviewPill label="Area Aktif" value="4 panel utama" tone="sky" />
              <OverviewPill label="Status" value="Siap dikelola" tone="emerald" />
              <OverviewPill label="Akses" value="Admin only" tone="slate" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Control Center
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Pilih area pengelolaan admin
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Setiap panel di bawah membawa kamu langsung ke area kerja yang paling sering dipakai dalam operasional VibePlan AI.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            Gunakan panel ini untuk masuk cepat ke konfigurasi, review request, dan pengelolaan user.
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <AdminCard
          href="/admin/ai-settings"
          badge="Konfigurasi"
          title="AI Settings"
          description="Validasi provider, cek diagnostics runtime, dan perbarui API key untuk development lokal."
          actionLabel="Buka AI Settings"
          tone="sky"
        />
        <AdminCard
          href="/admin/token-requests"
          badge="Request"
          title="Token Requests"
          description="Tinjau permintaan reset token user, beri catatan admin, lalu approve atau reject dengan cepat."
          actionLabel="Lihat Token Requests"
          tone="amber"
        />
        <AdminCard
          href="/admin/support-conversations"
          badge="Live Chat"
          title="Live Chat Support"
          description="Masuk ke inbox chat admin untuk membalas user dan guest secara langsung dari satu ruang kerja."
          actionLabel="Buka Live Chat"
          tone="violet"
        />
        <AdminCard
          href="/admin/users"
          badge="Data User"
          title="User Management"
          description="Buka daftar user untuk melihat profil, mengatur token, reset password, dan cek log aktivitas."
          actionLabel="Kelola User"
          tone="emerald"
        />
      </section>
    </div>
  );
}

function AdminCard({ href, badge, title, description, actionLabel, tone = "sky" }) {
  return (
    <Link
      href={href}
      className="group w-full overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/10 sm:p-7"
    >
      <div className={getAccentClassName(tone)} />
      <span className={getBadgeClassName(tone)}>{badge}</span>
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {description}
      </p>
      <div className="mt-6">
        <span className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition group-hover:bg-slate-800 sm:w-auto">
          {actionLabel}
        </span>
      </div>
    </Link>
  );
}

function OverviewPill({ label, value, tone = "slate" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${getValueToneClassName(tone)}`}>
        {value}
      </p>
    </div>
  );
}

function getAccentClassName(tone) {
  const classes = {
    sky: "mb-4 h-2 w-20 rounded-full bg-gradient-to-r from-sky-400 to-blue-500",
    amber: "mb-4 h-2 w-20 rounded-full bg-gradient-to-r from-amber-400 to-orange-500",
    violet: "mb-4 h-2 w-20 rounded-full bg-gradient-to-r from-violet-400 to-indigo-500",
    emerald: "mb-4 h-2 w-20 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500",
  };

  return classes[tone] || classes.sky;
}

function getBadgeClassName(tone) {
  const classes = {
    sky: "mb-4 inline-flex w-fit items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700",
    amber: "mb-4 inline-flex w-fit items-center rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700",
    violet: "mb-4 inline-flex w-fit items-center rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-violet-700",
    emerald: "mb-4 inline-flex w-fit items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700",
    slate: "mb-4 inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600",
  };

  return classes[tone] || classes.sky;
}

function getValueToneClassName(tone) {
  const classes = {
    sky: "text-sky-700",
    emerald: "text-emerald-700",
    slate: "text-slate-900",
  };

  return classes[tone] || classes.slate;
}
