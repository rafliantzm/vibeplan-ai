export const DEFAULT_TEAM_MEMBERS = [
  {
    name: "Raflian Taofiq Z.M",
    nim: "24.01.53.0008",
    role: "Developer Team",
    contribution: [
      "Membuat Planner System",
      "Merancang PRD",
      "Membuat Back-end",
      "Setting API",
      "Membuat Front-end",
      "Error Fixer",
      "Testing System",
      "Deployment",
    ],
    photo_url: "/img/Rafli.png",
  },
  {
    name: "Rafif Naraya",
    nim: "24.01.53.0009",
    role: "Developer Team and Planner",
    contribution: [
      "Database Planner",
      "Database Management",
      "Analysis Testing",
      "Paper Document Maker",
    ],
    photo_url: "/img/Rafif.png",
  },
];

export const TEAM_FOCUS_AREAS = [
  {
    title: "Product Planning",
    description: "Menyusun arah produk, alur fitur utama, dan struktur PRD agar implementasi tetap terarah.",
  },
  {
    title: "Backend & API",
    description: "Membangun fondasi Laravel API, integrasi AI, dan alur penyimpanan hasil generate secara stabil.",
  },
  {
    title: "Frontend Experience",
    description: "Merancang antarmuka Next.js yang nyaman dibaca, mudah dipakai, dan konsisten untuk pemula.",
  },
  {
    title: "Database & Testing",
    description: "Menata data MongoDB, menguji alur aplikasi, serta memastikan sistem siap dipresentasikan.",
  },
];

export function normalizeTeamMembers(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map((record) => {
      const fallbackMatch = DEFAULT_TEAM_MEMBERS.find(
        (member) =>
          member.nim === record?.nim ||
          member.name.toLowerCase() === String(record?.name || "").toLowerCase(),
      );

      return {
        name: record?.name || fallbackMatch?.name || "Anggota Tim",
        nim: record?.nim || fallbackMatch?.nim || "-",
        role: record?.role || fallbackMatch?.role || "Developer Team",
        contribution: normalizeContributions(record?.contribution, fallbackMatch?.contribution),
        photo_url: record?.photo_url || record?.avatar_url || fallbackMatch?.photo_url || null,
      };
    })
    .filter((member) => member.name);
}

function normalizeContributions(value, fallback = []) {
  if (Array.isArray(value) && value.length > 0) {
    return value.filter(Boolean);
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value
      .split(/[\n,•-]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return Array.isArray(fallback) ? fallback : [];
}
