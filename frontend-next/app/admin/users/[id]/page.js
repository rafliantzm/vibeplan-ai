"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import LoginRequiredCard from "@/components/auth/LoginRequiredCard";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import {
  adminGetUser,
  adminGetUserLogs,
  adminResetUserPassword,
  adminUpdateUser,
  adminUpdateUserTokens,
} from "@/lib/api";
import { getUser, subscribeAuthChange, updateStoredUser } from "@/lib/auth";
import { formatDate, getErrorMessage } from "@/lib/utils";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [isMounted, setIsMounted] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [logs, setLogs] = useState([]);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "user",
    status: "active",
  });
  const [tokenForm, setTokenForm] = useState({
    token_balance: 0,
    reason: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    new_password: "",
    new_password_confirmation: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState({
    profile: false,
    password: false,
    tokens: false,
  });
  const isAdmin = sessionUser?.role === "admin";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
      setSessionUser(getUser());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return undefined;
    }

    function syncUser() {
      setSessionUser(getUser());
    }

    const unsubscribe = subscribeAuthChange(syncUser);

    return unsubscribe;
  }, [isMounted]);

  const loadUserData = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      const [userPayload, logsPayload] = await Promise.all([
        adminGetUser(userId),
        adminGetUserLogs(userId),
      ]);
      const nextUser = userPayload?.data || null;
      setUserDetail(nextUser);
      setLogs(logsPayload?.data || []);
      setEditForm({
        name: nextUser?.name || "",
        email: nextUser?.email || "",
        role: nextUser?.role || "user",
        status: nextUser?.status || "active",
      });
      setTokenForm({
        token_balance: nextUser?.token_balance ?? 0,
        reason: "",
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isMounted || !isAdmin || !userId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadUserData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isMounted, isAdmin, userId, loadUserData]);

  function handleEditChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  function handleTokenChange(event) {
    const { name, value } = event.target;
    setTokenForm((current) => ({ ...current, [name]: value }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting((current) => ({ ...current, profile: true }));
      setError("");
      setStatusMessage("");
      const payload = await adminUpdateUser(userId, editForm);
      const nextUser = payload?.data || null;
      setUserDetail(nextUser);
      if (sessionUser?.id === nextUser?.id) {
        updateStoredUser({
          ...sessionUser,
          name: nextUser.name,
          email: nextUser.email,
          role: nextUser.role,
          token_balance: nextUser.token_balance,
          status: nextUser.status,
        });
      }
      setStatusMessage("Profil user berhasil diperbarui.");
      await loadUserData();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting((current) => ({ ...current, profile: false }));
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting((current) => ({ ...current, password: true }));
      setError("");
      setStatusMessage("");
      const payload = await adminResetUserPassword(userId, passwordForm);
      setPasswordForm({
        new_password: "",
        new_password_confirmation: "",
      });
      setStatusMessage(payload?.message || "Password user berhasil direset.");
      await loadUserData();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting((current) => ({ ...current, password: false }));
    }
  }

  async function handleTokensSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting((current) => ({ ...current, tokens: true }));
      setError("");
      setStatusMessage("");
      const payload = await adminUpdateUserTokens(userId, {
        token_balance: Number(tokenForm.token_balance),
        reason: tokenForm.reason,
      });
      const nextUser = payload?.data || null;
      setUserDetail(nextUser);
      if (sessionUser?.id === nextUser?.id) {
        updateStoredUser({
          ...sessionUser,
          token_balance: nextUser.token_balance,
        });
      }
      setStatusMessage(payload?.message || "Token user berhasil diperbarui.");
      await loadUserData();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting((current) => ({ ...current, tokens: false }));
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
        message="Silakan login dengan akun admin untuk membuka detail user."
        actionLabel={sessionUser ? "Kembali ke Home" : "Login Admin"}
        onAction={() => {
          window.location.href = sessionUser ? "/" : `/login?redirect=/admin/users/${userId || ""}`;
        }}
      />
    );
  }

  if (isLoading && !userDetail) {
    return (
      <LoadingState
        title="Memuat detail user..."
        description="Data user dan log aktivitas sedang diambil dari backend."
      />
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          User Detail
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Detail user dan pengelolaan akun
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
          Admin dapat memperbarui profil user, mereset password, mengatur token, dan meninjau log aktivitas.
        </p>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {statusMessage ? (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {statusMessage}
        </section>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-semibold text-slate-900">{userDetail?.name || "-"}</h2>
        <p className="mt-2 text-sm text-slate-500">{userDetail?.email || "-"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="border-slate-200 bg-slate-50 text-slate-700">
            {userDetail?.role || "user"}
          </Badge>
          <Badge className="border-sky-200 bg-sky-50 text-sky-700">
            {userDetail?.token_balance ?? 0} Tokens
          </Badge>
          <Badge
            className={
              userDetail?.status === "blocked"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }
          >
            {userDetail?.status || "active"}
          </Badge>
        </div>

        <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <InfoItem label="Nama" value={userDetail?.name || "-"} />
          <InfoItem label="Email" value={userDetail?.email || "-"} />
          <InfoItem label="Role" value={userDetail?.role || "user"} />
          <InfoItem label="Token Balance" value={`${userDetail?.token_balance ?? 0}`} />
          <InfoItem label="Status" value={userDetail?.status || "active"} />
          <InfoItem label="Dibuat" value={formatDate(userDetail?.created_at)} />
          <InfoItem label="Diupdate" value={formatDate(userDetail?.updated_at)} />
        </div>
      </section>

      <section id="edit-user" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Edit User</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Perbarui profil user</h2>
        <form onSubmit={handleProfileSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Nama" name="name" value={editForm.name} onChange={handleEditChange} required />
          <Field label="Email" name="email" type="email" value={editForm.email} onChange={handleEditChange} required />
          <SelectField
            label="Role"
            name="role"
            value={editForm.role}
            onChange={handleEditChange}
            options={[
              { label: "User", value: "user" },
              { label: "Admin", value: "admin" },
            ]}
          />
          <SelectField
            label="Status"
            name="status"
            value={editForm.status}
            onChange={handleEditChange}
            options={[
              { label: "Active", value: "active" },
              { label: "Blocked", value: "blocked" },
            ]}
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting.profile}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting.profile ? "Menyimpan..." : "Simpan Perubahan User"}
            </button>
          </div>
        </form>
      </section>

      <section id="reset-password" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Reset Password</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Reset password user</h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Admin tidak dapat melihat password lama user. Admin hanya dapat melakukan reset password.
        </p>
        <form onSubmit={handlePasswordSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            label="Password Baru"
            name="new_password"
            type="password"
            value={passwordForm.new_password}
            onChange={handlePasswordChange}
            required
          />
          <Field
            label="Konfirmasi Password Baru"
            name="new_password_confirmation"
            type="password"
            value={passwordForm.new_password_confirmation}
            onChange={handlePasswordChange}
            required
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting.password}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {isSubmitting.password ? "Mereset..." : "Reset Password User"}
            </button>
          </div>
        </form>
      </section>

      <section id="manage-tokens" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Token Management</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Atur token balance user</h2>
        <form onSubmit={handleTokensSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            label="Token Balance"
            name="token_balance"
            type="number"
            min="0"
            value={tokenForm.token_balance}
            onChange={handleTokenChange}
            required
          />
          <Field
            label="Alasan Perubahan"
            name="reason"
            value={tokenForm.reason}
            onChange={handleTokenChange}
            placeholder="Contoh: reset token karena permintaan user"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting.tokens}
              className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              {isSubmitting.tokens ? "Menyimpan..." : "Simpan Token Balance"}
            </button>
          </div>
        </form>
      </section>

      <section id="user-logs" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">User Logs</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Log aktivitas user</h2>
        <div className="mt-6 grid gap-4">
          {logs.length > 0 ? (
            logs.map((log) => (
              <article
                key={log.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{log.action}</p>
                    <p className="mt-1 text-sm leading-7 text-slate-600">{log.description}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {formatDate(log.created_at)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500">
                  <p>Performed By: {log.performed_by || "-"}</p>
                  {log.metadata && Object.keys(log.metadata).length > 0 ? (
                    <pre className="overflow-x-auto rounded-2xl bg-slate-900 px-4 py-3 text-[11px] leading-6 text-slate-100">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm leading-7 text-slate-600">
              Belum ada log aktivitas untuk user ini.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      />
    </label>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        {...props}
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children, className }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${className}`}>
      {children}
    </span>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value || "-"}</p>
    </div>
  );
}
