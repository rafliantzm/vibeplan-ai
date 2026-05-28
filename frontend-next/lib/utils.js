import { GENERATION_LABELS } from "@/lib/constants";

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getGenerationLabel(type) {
  return GENERATION_LABELS[type] || type || "Unknown";
}

export function getGenerationBadgeClass(type) {
  if (type === "prd") {
    return "bg-amber-100 text-amber-700 ring-amber-200";
  }

  if (type === "next-step") {
    return "bg-sky-100 text-sky-700 ring-sky-200";
  }

  if (type === "coding-prompt") {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function getErrorMessage(error) {
  if (error?.errorCode) {
    switch (error.errorCode) {
      case "REQUEST_TIMEOUT":
        return "Request terlalu lama diproses. Silakan coba lagi, gunakan Mode Ringkas, atau periksa koneksi backend.";
      case "OUTPUT_TRUNCATED":
        return "Output AI terlalu panjang dan terpotong. Gunakan Mode Ringkas atau kurangi isi input agar hasil tidak terpotong.";
      case "INPUT_TOO_LARGE":
        return "File PRD terlalu panjang untuk diproses dalam mode normal. Gunakan Mode Ringkas atau upload PRD yang lebih pendek.";
      case "AI_KEY_INVALID":
        return "API key tidak valid atau tidak memiliki akses model.";
      case "MODEL_NOT_ALLOWED":
        return "API key valid, tetapi model tidak diizinkan pada project Groq ini.";
      case "AI_PROVIDER_UNREACHABLE":
        return "Provider AI sedang tidak bisa dijangkau.";
      case "PROVIDER_LIMIT":
        return "Provider AI sedang terkena limit. Coba lagi nanti atau gunakan mode ringkas.";
      default:
        break;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

export function getGenerationId(item) {
  if (!item) {
    return null;
  }

  return item.id || item._id || null;
}

export function getGenerationResponseId(response) {
  if (!response) {
    return null;
  }

  return (
    response.id ||
    response._id ||
    response.data?.id ||
    response.data?._id ||
    response.generation?.id ||
    response.generation?._id ||
    response.data?.generation?.id ||
    response.data?.generation?._id ||
    null
  );
}

export function extractFilename(headers, fallbackName = "vibeplan-result.md") {
  const disposition = headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallbackName;
}
