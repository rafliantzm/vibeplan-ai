"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import ErrorState from "@/components/common/ErrorState";
import { resetPassword } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({
    password: "",
    password_confirmation: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isLinkValid = email.trim() !== "" && token.trim() !== "";

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isLinkValid) {
      setError("Link reset password tidak valid atau tidak lengkap.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const response = await resetPassword({
        email,
        token,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setSuccessMessage(response?.message || "Password berhasil diperbarui. Silakan login dengan password baru.");
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          Password Baru
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Reset Password
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Masukkan password baru untuk akun <span className="font-semibold text-slate-900">{email || "kamu"}</span>.
        </p>

        {!isLinkValid ? (
          <div className="mt-6">
            <ErrorState message="Link reset password tidak valid atau tidak lengkap." />
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-700">
            {successMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Password Baru</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Konfirmasi Password Baru</span>
              <input
                type="password"
                name="password_confirmation"
                value={form.password_confirmation}
                onChange={handleChange}
                required
                minLength={8}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting || !isLinkValid}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Memperbarui password..." : "Reset Password"}
            </button>
          </form>
        )}

        {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}

        <p className="mt-6 text-sm text-slate-600">
          Kembali ke{" "}
          <Link href="/login" className="font-semibold text-sky-700">
            halaman login
          </Link>
        </p>
      </section>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-xl text-sm text-slate-500">Memuat halaman reset password...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
