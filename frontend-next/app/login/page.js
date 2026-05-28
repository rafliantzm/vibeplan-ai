"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import ErrorState from "@/components/common/ErrorState";
import { loginUser } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/generate";
  const [form, setForm] = useState({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError("");
      await loginUser(form);
      router.push(redirect);
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
          Login
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          Masuk ke VibePlan AI
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Login diperlukan untuk menggunakan fitur generate AI, melihat history pribadi, dan mengelola token.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
            />
          </label>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-semibold text-sky-700">
              Lupa Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Memproses login..." : "Login"}
          </button>
        </form>

        {error ? <div className="mt-5"><ErrorState message={error} /></div> : null}

        <p className="mt-6 text-sm text-slate-600">
          Belum punya akun?{" "}
          <Link href={`/register?redirect=${encodeURIComponent(redirect)}`} className="font-semibold text-sky-700">
            Daftar di sini
          </Link>
        </p>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-xl text-sm text-slate-500">Memuat halaman login...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
