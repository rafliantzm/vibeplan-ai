"use client";

import Link from "next/link";
import { useState } from "react";
import ErrorState from "@/components/common/ErrorState";
import { forgotPassword } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      const response = await forgotPassword(email);
      setSuccessMessage(response?.message || "Jika email terdaftar, link reset password akan dikirim ke email tersebut.");
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
          Reset Password
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Lupa Password
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Masukkan email akun kamu. Jika terdaftar, kami akan mengirim link reset password.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Mengirim link..." : "Kirim Link Reset"}
          </button>
        </form>

        {successMessage ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-700">
            {successMessage}
          </div>
        ) : null}

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
