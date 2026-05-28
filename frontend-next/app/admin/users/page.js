"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import { adminGetUsers } from "@/lib/api";
import { getUser, subscribeAuthChange } from "@/lib/auth";
import { formatDate, getErrorMessage } from "@/lib/utils";

const DEFAULT_FILTERS = {
  search: "",
  role: "",
  status: "",
};

const CARD_CLASS =
  "w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-900/5 sm:p-6";
const INPUT_CLASS =
  "block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200";

export default function AdminUsersPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState("");
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

  const loadUsers = useCallback(async (nextFilters = filters) => {
    try {
      setIsLoading(true);
      setError("");
      const payload = await adminGetUsers(nextFilters);
      setUsers(payload?.data || []);
      setMeta(payload?.meta || null);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
      setIsApplying(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!isMounted || !isAdmin) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadUsers(DEFAULT_FILTERS);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMounted, isAdmin, loadUsers]);

  const summary = useMemo(() => {
    return users.reduce(
      (accumulator, item) => {
        if (item.role === "admin") {
          accumulator.admin += 1;
        } else {
          accumulator.user += 1;
        }

        if (item.status === "blocked") {
          accumulator.blocked += 1;
        } else {
          accumulator.active += 1;
        }

        return accumulator;
      },
      { admin: 0, user: 0, active: 0, blocked: 0 }
    );
  }, [users]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleApplyFilters(event) {
    event.preventDefault();
    setIsApplying(true);
    await loadUsers(filters);
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
        message="Silakan login dengan akun admin untuk membuka user management."
        actionLabel={user ? "Kembali ke Home" : "Login Admin"}
        onAction={() => {
          window.location.href = user ? "/" : "/login?redirect=/admin/users";
        }}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-white via-emerald-50/65 to-sky-50/65 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
              Admin Users
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              User Management
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              Kelola data user, status akun, token, dan informasi profil secara aman.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Ringkasan Data
            </p>
            <div className="mt-4 grid gap-3">
              <SummaryPill label="Total user" value={`${meta?.total ?? users.length} akun`} tone="sky" />
              <SummaryPill label="Status aktif" value={`${summary.active} aktif`} tone="emerald" />
              <SummaryPill label="Akun diblokir" value={`${summary.blocked} blocked`} tone="rose" />
            </div>
          </div>
        </div>
      </section>

      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Filter User
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Cari dan saring data user
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Gunakan pencarian nama atau email, lalu sempitkan hasil berdasarkan role dan status akun jika diperlukan.
            </p>
          </div>
          {meta ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              Menampilkan <span className="font-semibold text-slate-900">{users.length}</span> user dari total{" "}
              <span className="font-semibold text-slate-900">{meta.total}</span>.
            </div>
          ) : null}
        </div>

        <form onSubmit={handleApplyFilters} className="mt-5 grid gap-4 lg:grid-cols-[1.8fr_1fr_1fr_auto]">
          <Field
            label="Cari nama atau email"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Cari user..."
          />
          <SelectField
            label="Role"
            name="role"
            value={filters.role}
            onChange={handleFilterChange}
            options={[
              { label: "Semua Role", value: "" },
              { label: "User", value: "user" },
              { label: "Admin", value: "admin" },
            ]}
          />
          <SelectField
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={[
              { label: "Semua Status", value: "" },
              { label: "Active", value: "active" },
              { label: "Blocked", value: "blocked" },
            ]}
          />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isApplying}
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isApplying ? "Mencari..." : "Terapkan Filter"}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MiniStatCard
          label="Role Admin"
          value={summary.admin}
          caption="Akun dengan akses penuh ke panel admin."
          tone="sky"
        />
        <MiniStatCard
          label="Role User"
          value={summary.user}
          caption="Akun member yang menggunakan fitur utama VibePlan AI."
          tone="slate"
        />
        <MiniStatCard
          label="Status Blocked"
          value={summary.blocked}
          caption="Akun yang sedang dibatasi aksesnya."
          tone="rose"
        />
      </section>

      {isLoading ? (
        <LoadingState
          title="Memuat data user..."
          description="Daftar user sedang diambil dari backend Laravel."
        />
      ) : null}

      {!isLoading && error ? <ErrorState message={error} onRetry={() => loadUsers(filters)} /> : null}

      {!isLoading && !error ? (
        users.length > 0 ? (
          <section className="grid gap-4">
            {users.map((item) => (
              <article key={item.id} className={CARD_CLASS}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RoleBadge role={item.role} />
                      <StatusBadge status={item.status} />
                      <TokenBadge tokenBalance={item.token_balance} />
                    </div>

                    <h2 className="mt-4 break-words text-xl font-semibold text-slate-900">
                      {item.name}
                    </h2>
                    <p className="mt-1 break-words text-sm text-slate-500">{item.email}</p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <InfoBlock label="Role" value={item.role === "admin" ? "Admin" : "User"} />
                      <InfoBlock label="Status" value={item.status || "active"} />
                      <InfoBlock label="Token Balance" value={`${item.token_balance ?? 0}`} />
                      <InfoBlock label="Created Date" value={formatDate(item.created_at)} />
                    </div>
                  </div>

                  <div className="grid w-full gap-3 rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 lg:max-w-sm">
                    <ActionLink href={`/admin/users/${item.id}`} tone="primary">
                      View Detail
                    </ActionLink>
                    <ActionLink href={`/admin/users/${item.id}#edit-user`}>
                      Edit Name / Email
                    </ActionLink>
                    <ActionLink href={`/admin/users/${item.id}#manage-tokens`}>
                      Reset / Update Token
                    </ActionLink>
                    <ActionLink href={`/admin/users/${item.id}#reset-password`}>
                      Reset Password
                    </ActionLink>
                    <ActionLink href={`/admin/users/${item.id}#user-logs`}>
                      View Logs
                    </ActionLink>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className={CARD_CLASS}>
            <h2 className="text-xl font-semibold text-slate-900">Belum ada data user yang tersedia.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Coba ubah kata kunci pencarian, reset filter role/status, atau tunggu hingga data user baru tersedia.
            </p>
          </section>
        )
      ) : null}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input {...props} className={INPUT_CLASS} />
    </label>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select {...props} className={INPUT_CLASS}>
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniStatCard({ label, value, caption, tone = "slate" }) {
  const toneClass = {
    slate: "bg-gradient-to-br from-slate-50 to-white",
    sky: "bg-gradient-to-br from-sky-50 to-white",
    rose: "bg-gradient-to-br from-rose-50 to-white",
  }[tone];

  return (
    <div className={`${CARD_CLASS} ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{caption}</p>
    </div>
  );
}

function SummaryPill({ label, value, tone = "sky" }) {
  const toneClass = {
    sky: "text-sky-700",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function RoleBadge({ role }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
      {role === "admin" ? "Admin" : "User"}
    </span>
  );
}

function StatusBadge({ status }) {
  const badgeClass =
    status === "blocked"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${badgeClass}`}>
      {status || "active"}
    </span>
  );
}

function TokenBadge({ tokenBalance }) {
  return (
    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
      {tokenBalance ?? 0} Tokens
    </span>
  );
}

function ActionLink({ href, children, tone = "secondary" }) {
  const toneClass =
    tone === "primary"
      ? "bg-slate-950 text-white hover:bg-slate-800 border-slate-950"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${toneClass}`}
    >
      {children}
    </Link>
  );
}
