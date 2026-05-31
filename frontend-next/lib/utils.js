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

export function slugifyFilename(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function cleanProjectTitle(value) {
  return String(value || "")
    .replace(/^#+\s*/g, "")
    .replace(/^(prd|product requirements document|next step planner|coding prompt generator|coding prompt|roadmap)\s*[-:|]\s*/i, "")
    .replace(/\s*[-:|]\s*(prd|product requirements document|next step planner|coding prompt generator|coding prompt|roadmap)$/i, "")
    .replace(/\bproduct requirements document\b/gi, "")
    .replace(/\bnext step planner\b/gi, "")
    .replace(/\bcoding prompt generator\b/gi, "")
    .replace(/\bcoding prompts?\b/gi, "")
    .replace(/\broadmap\b/gi, "")
    .replace(/\bprd\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildMarkdownFilename(result) {
  const rawTitle =
    result?.project?.project_name ||
    result?.project_name ||
    result?.projectName ||
    result?.json_content?.project_name ||
    result?.json_content?.input_snapshot?.project_name ||
    result?.metadata?.project_name ||
    result?.metadata?.projectTitle ||
    result?.input?.project_name ||
    result?.title ||
    "vibeplan";

  const cleanTitle = cleanProjectTitle(rawTitle) || "vibeplan";
  const slug = slugifyFilename(cleanTitle) || "vibeplan";

  const type =
    result?.generation_type ||
    result?.generationType ||
    result?.type ||
    result?.json_content?.generation_type ||
    result?.metadata?.generation_type ||
    result?.metadata?.generationType ||
    "";

  const normalizedType = String(type).toLowerCase();

  const suffixMap = {
    prd: "prd",
    prd_generator: "prd",
    "prd-generator": "prd",
    "next-step": "next-step-planner",
    next_step: "next-step-planner",
    next_step_planner: "next-step-planner",
    "next-step-planner": "next-step-planner",
    "coding-prompt": "coding-prompt",
    coding_prompt: "coding-prompt",
    coding_prompt_generator: "coding-prompt",
    "coding-prompt-generator": "coding-prompt",
  };

  const suffix = suffixMap[normalizedType] || "result";

  return `${slug}-${suffix}.md`;
}

export function extractFilename(headers, fallbackName = "vibeplan.md") {
  const disposition = headers.get("content-disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallbackName;
}
