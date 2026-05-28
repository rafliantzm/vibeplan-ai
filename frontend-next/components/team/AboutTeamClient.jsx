"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import ErrorState from "@/components/common/ErrorState";
import LoadingState from "@/components/common/LoadingState";
import { getTeamMembers } from "@/lib/api";
import {
  DEFAULT_TEAM_MEMBERS,
  normalizeTeamMembers,
  TEAM_FOCUS_AREAS,
} from "@/lib/team";
import { getErrorMessage } from "@/lib/utils";

export default function AboutTeamClient() {
  const [members, setMembers] = useState(DEFAULT_TEAM_MEMBERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [failedImages, setFailedImages] = useState({});

  const loadMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const payload = await getTeamMembers();
      const records = Array.isArray(payload?.data) ? payload.data : payload;
      const normalized = normalizeTeamMembers(records);

      if (normalized.length > 0) {
        setMembers(normalized);
      } else {
        setMembers(DEFAULT_TEAM_MEMBERS);
      }
    } catch (teamError) {
      setMembers(DEFAULT_TEAM_MEMBERS);
      setError(getErrorMessage(teamError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMembers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadMembers]);

  const hasRemoteError = Boolean(error);
  const teamMembers = useMemo(
    () => (members.length > 0 ? members : DEFAULT_TEAM_MEMBERS),
    [members],
  );

  if (isLoading) {
    return (
      <LoadingState
        title="Memuat profil tim..."
        description="Sedang menyiapkan data tim pengembang VibePlan AI."
      />
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-white/88 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          About Team
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Tim di balik VibePlan AI
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          VibePlan AI dikembangkan oleh tim yang berfokus pada perencanaan produk,
          pengembangan sistem, integrasi AI, dan pengalaman pengguna.
        </p>
      </section>

      {hasRemoteError ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <ErrorState message={error} />
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-2">
        {teamMembers.map((member) => (
          <article
            key={member.nim}
            className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/10"
          >
            <div className="bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_42%),linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(255,255,255,1))] p-6 sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="shrink-0">
                  <ProfilePhoto
                    member={member}
                    failedImages={failedImages}
                    onImageError={(name) =>
                      setFailedImages((current) => ({ ...current, [name]: true }))
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-2xl font-semibold text-slate-900">
                        {member.name}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">NIM: {member.nim}</p>
                    </div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {member.role}
                    </span>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Kontribusi Utama
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {member.contribution.map((item) => (
                        <span
                          key={`${member.nim}-${item}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600">
            Focus Area
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-900">
            Fokus Pengembangan
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Pengembangan VibePlan AI dibangun dengan pembagian fokus yang jelas agar
            perencanaan, implementasi, dan pengujian berjalan lebih terarah.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TEAM_FOCUS_AREAS.map((area) => (
            <article
              key={area.title}
              className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5"
            >
              <h3 className="text-lg font-semibold text-slate-900">{area.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {area.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfilePhoto({ member, failedImages, onImageError }) {
  const shouldFallback = !member.photo_url || failedImages[member.name];

  if (shouldFallback) {
    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-[1.75rem] bg-[linear-gradient(135deg,_#0f172a,_#4338ca,_#0ea5e9)] text-4xl font-semibold text-white shadow-lg shadow-slate-900/10">
        {getInitial(member.name)}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-md shadow-slate-900/5">
      <Image
        src={member.photo_url}
        alt={`Foto profil ${member.name}`}
        width={224}
        height={224}
        className="h-32 w-32 object-cover"
        onError={() => onImageError(member.name)}
      />
    </div>
  );
}

function getInitial(name) {
  if (!name || typeof name !== "string") {
    return "V";
  }

  return name.trim().charAt(0).toUpperCase() || "V";
}
