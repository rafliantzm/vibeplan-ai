"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { getCurrentUser } from "@/lib/api";
import { clearSession, setSession, setTokenOnly } from "@/lib/auth";

function AuthCallbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let isMounted = true;
    const token = searchParams.get("token");

    async function finishGoogleLogin() {
      if (!token) {
        router.replace("/login?error=token_missing");
        return;
      }

      try {
        setTokenOnly(token);
        const payload = await getCurrentUser();

        if (!isMounted || !payload?.user) {
          clearSession();
          router.replace("/login?error=token_missing");
          return;
        }

        setSession(token, payload.user);
        router.replace("/generate");
      } catch {
        if (!isMounted) {
          return;
        }

        clearSession();
        router.replace("/login?error=google_login_failed");
      }
    }

    void finishGoogleLogin();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-xl items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          Google Login
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Menyelesaikan proses login
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          Token sedang diverifikasi dan sesi Anda sedang disiapkan.
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-xl text-sm text-slate-500">Memproses login Google...</div>}>
      <AuthCallbackPageContent />
    </Suspense>
  );
}
