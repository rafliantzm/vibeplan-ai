const AGENT_CARD_COPY = {
  auto: {
    title: "Auto Recommend",
    description: "Sistem memilih agent terbaik.",
    tag: "Recommended",
  },
  codex: {
    title: "Codex",
    description: "Cocok untuk build full-stack terstruktur.",
    tag: "Structured",
  },
  claude_code: {
    title: "Claude Code",
    description: "Ideal untuk debugging dan membaca codebase.",
    tag: "Debugging",
  },
  github_copilot: {
    title: "GitHub Copilot",
    description: "Cocok untuk workflow VS Code dan GitHub.",
    tag: "IDE Workflow",
  },
  antigravity: {
    title: "Antigravity",
    description: "Bagus untuk task breakdown agentic.",
    tag: "Agentic",
  },
  manual_beginner: {
    title: "Manual Guide",
    description: "Pilihan sederhana untuk pemula.",
    tag: "Beginner",
  },
};

const BASE_CARD_CLASS =
  "group rounded-[1.5rem] border p-4 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2";
const SELECTED_CARD_CLASS =
  "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15";
const DEFAULT_CARD_CLASS =
  "border-slate-200 bg-white text-slate-900 hover:border-sky-200 hover:bg-sky-50/50 hover:shadow-md";
const PROJECT_IDEA_MAX_LENGTH = 15000;

export default function GeneratorForm({
  generationType,
  form,
  onChange,
  onSubmit,
  isSubmitting,
  submitLabel,
  loadingLabel,
  plannerAgent,
  onPlannerAgentChange,
  codingPromptAgent,
  onCodingPromptAgentChange,
  codingPromptGenerationMode,
  onCodingPromptGenerationModeChange,
  agentOptions = [],
  prdSourceMode,
  onPrdSourceModeChange,
  nextStepGenerationMode,
  onNextStepGenerationModeChange,
  onPrdFileChange,
  uploadedPrdFilename,
  uploadedPrdPreview,
  uploadedPrdFileSize,
  uploadedPrdCharCount,
  onNextStepFileChange,
  uploadedNextStepFilename,
  uploadedNextStepPreview,
}) {
  const showProjectFields =
    generationType === "prd" ||
    (generationType === "next-step" && prdSourceMode === "form");

  return (
    <form onSubmit={onSubmit} className="grid w-full min-w-0 gap-4 sm:gap-5">
      {generationType === "next-step" ? (
        <>
          <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm shadow-slate-900/5 sm:p-5 md:p-6">
            <SectionHeader
              badge="Sumber Input"
              title="Pilih sumber dokumen"
              description="Tentukan apakah roadmap dibuat dari form project atau dari PRD yang sudah tersedia."
            />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <OptionCard
                title="Isi Form Project"
                description="Mulai dari brief project yang kamu isi langsung di halaman ini."
                hint="Mulai dari nol"
                isSelected={prdSourceMode === "form"}
                onClick={() => onPrdSourceModeChange("form")}
              />
              <OptionCard
                title="Upload File .md"
                description="Gunakan PRD yang sudah ada agar roadmap mengikuti dokumen kerja yang tersedia."
                hint="Dokumen siap pakai"
                isSelected={prdSourceMode === "upload"}
                onClick={() => onPrdSourceModeChange("upload")}
              />
            </div>

            {prdSourceMode === "upload" ? (
              <div className="mt-5 w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-violet-100 bg-violet-50/50 p-4 shadow-sm sm:p-5 md:p-6">
                <SectionHeader
                  badge="Upload Dokumen"
                  title="Gunakan PRD yang sudah kamu punya"
                  description="Upload file .md atau .txt agar roadmap disusun dari dokumen kerja yang sudah tersedia."
                  helper="Dokumen upload akan dipakai sebagai konteks utama saat menyusun langkah berikutnya."
                />

                <FileInputCard
                  label="File PRD (.md atau .txt) *"
                  onChange={onPrdFileChange}
                />

                {uploadedPrdFilename ? (
                  <FilePreviewCard
                    filename={uploadedPrdFilename}
                    preview={uploadedPrdPreview}
                    meta={`Ukuran file: ${formatFileSize(uploadedPrdFileSize)} / Jumlah karakter: ${uploadedPrdCharCount.toLocaleString("id-ID")}`}
                    warning={
                      uploadedPrdCharCount > 12000
                        ? "Dokumen cukup panjang. Mode Ringkas bisa membantu hasil tetap lebih stabil."
                        : ""
                    }
                  />
                ) : (
                  <InlineInfo
                    title="Belum ada file yang dipilih"
                    description="Upload PRD jika kamu ingin roadmap mengikuti dokumen kerja yang sudah disusun sebelumnya."
                  />
                )}

                <GenerationModeSelector
                  value={nextStepGenerationMode}
                  onChange={onNextStepGenerationModeChange}
                  title="Mode Ringkas"
                  description="Buat roadmap lebih pendek, fokus pada langkah utama, dan lebih aman dari output terpotong."
                  badgeText="Output Lebih Aman"
                  helperText="Pilih Ringkas saat file cukup panjang atau kamu ingin hasil yang lebih padat."
                />
              </div>
            ) : (
              <div className="mt-5">
                <InlineInfo
                  title="Form project aktif"
                  description="Isi detail inti project di bawah untuk menyusun roadmap langsung dari brief yang kamu tulis."
                />
              </div>
            )}
          </section>

          <AgentSection
            badge="Coding Agent"
            title="Pilih workflow coding"
            description="Sesuaikan gaya roadmap dengan tool coding yang paling nyaman kamu gunakan."
            selectedValue={plannerAgent}
            onSelect={onPlannerAgentChange}
            agentOptions={agentOptions}
            includeAuto
          />
        </>
      ) : null}

      {generationType === "coding-prompt" ? (
        <>
          <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-violet-100 bg-violet-50/50 p-4 shadow-sm sm:p-5 md:p-6">
            <SectionHeader
              badge="Upload Dokumen"
              title="Gunakan roadmap yang sudah siap"
              description="Upload file .md atau .txt agar prompt coding dibangun dari langkah kerja yang sudah ada."
              helper="File roadmap menjadi sumber utama untuk menyusun prompt yang lebih siap dipakai."
            />

            <FileInputCard
              label="File Next Step Planner (.md atau .txt) *"
              onChange={onNextStepFileChange}
            />

            {uploadedNextStepFilename ? (
              <FilePreviewCard
                filename={uploadedNextStepFilename}
                preview={uploadedNextStepPreview}
                meta="Dokumen roadmap berhasil dibaca dan siap dipakai untuk menyusun prompt coding."
              />
            ) : (
              <InlineInfo
                title="Belum ada file yang dipilih"
                description="Upload roadmap hasil VibePlan AI atau dokumen kerja tim agar prompt coding yang dibuat lebih relevan."
              />
            )}

            <GenerationModeSelector
              value={codingPromptGenerationMode}
              onChange={onCodingPromptGenerationModeChange}
              title="Mode Ringkas"
              description="Buat prompt lebih pendek dan langsung siap dipakai agar output tidak terlalu panjang."
              badgeText="Output Lebih Aman"
              helperText="Hasil lebih pendek, fokus pada prompt inti, dan lebih aman dari output terpotong."
            />
          </section>

          <AgentSection
            badge="Coding Agent"
            title="Pilih workflow coding"
            description="Pilih agent yang paling cocok dengan cara kerja coding yang ingin kamu jalankan."
            selectedValue={codingPromptAgent}
            onSelect={onCodingPromptAgentChange}
            agentOptions={agentOptions}
            includeAuto
          />
        </>
      ) : null}

      {showProjectFields ? (
        <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-900/5 sm:p-5 md:p-6">
          <SectionHeader
            badge="Detail Project"
            title="Lengkapi konteks inti project"
            description="Bagian ini membantu AI memahami kebutuhan utama project sebelum menyusun hasil generate."
          />

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Nama Project"
              name="project_name"
              value={form.project_name}
              onChange={onChange}
              placeholder="Contoh: VibePlan AI"
              required
            />
            <Field
              label="Target User"
              name="target_user"
              value={form.target_user}
              onChange={onChange}
              placeholder="Mahasiswa, pemula coding, vibe coder"
            />
          </div>

          <div className="mt-5">
            <TextareaField
              label="Ide Project"
              name="project_idea"
              value={form.project_idea}
              onChange={onChange}
              placeholder="Jelaskan ide aplikasi yang ingin dibangun."
              maxLength={PROJECT_IDEA_MAX_LENGTH}
              required
            />
            <p className="mt-2 text-right text-xs text-slate-500">
              {form.project_idea.length.toLocaleString("id-ID")} / {PROJECT_IDEA_MAX_LENGTH.toLocaleString("id-ID")} karakter
            </p>
          </div>

          <div className="mt-5">
            <TextareaField
              label="Masalah Utama"
              name="main_problem"
              value={form.main_problem}
              onChange={onChange}
              placeholder="Masalah apa yang ingin diselesaikan aplikasi ini?"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field
              label="Tipe Aplikasi"
              name="app_type"
              value={form.app_type}
              onChange={onChange}
              placeholder="Web Application"
            />
            <Field
              label="Tech Stack"
              name="tech_stack"
              value={form.tech_stack}
              onChange={onChange}
              placeholder="Next.js, Laravel, MongoDB"
            />
            <Field
              label="Skill Level"
              name="skill_level"
              value={form.skill_level}
              onChange={onChange}
              placeholder="Beginner"
            />
          </div>

          <div className="mt-5">
            <TextareaField
              label="Catatan / PRD Awal"
              name="initial_prd"
              value={form.initial_prd}
              onChange={onChange}
              placeholder="Opsional. Tambahkan constraint, fitur wajib, atau catatan awal."
            />
          </div>
        </section>
      ) : generationType === "next-step" ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Detail project disembunyikan karena roadmap akan dibuat dari dokumen yang kamu upload. Jika ingin mulai dari brief project biasa, pilih <strong>Isi Form Project</strong>.
        </div>
      ) : generationType === "coding-prompt" ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Bagian form project tidak diperlukan di mode ini. Prompt akan disusun dari file Next Step Planner yang kamu upload.
        </div>
      ) : null}

      <div className="flex w-full max-w-full min-w-0 flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 md:flex-row md:items-center md:justify-between">
        <p className="max-w-full break-words rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 md:max-w-2xl">
          Lengkapi informasi dengan jelas agar hasil generate lebih akurat, lebih mudah dipakai, dan tidak perlu banyak revisi di langkah berikutnya.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? loadingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}

function SectionHeader({ badge, title, description, helper = "", badgeTone = "slate" }) {
  return (
    <div className="min-w-0">
      <span className={getBadgeClassName(badgeTone)}>
        {badge}
      </span>
      <h3 className="mt-3 text-xl font-bold leading-tight text-slate-950 md:text-2xl">{title}</h3>
      <p className="mt-2 max-w-full text-sm leading-7 text-slate-600 md:max-w-3xl md:text-base">{description}</p>
      {helper ? (
        <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function FileInputCard({ label, onChange }) {
  return (
    <div className="mt-4 w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm shadow-slate-900/5">
      <label className="grid min-w-0 gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <input
          type="file"
          accept=".md,.txt"
          onChange={onChange}
          className="block w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 file:mb-3 file:mr-0 file:block file:w-full file:max-w-full file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white sm:px-4 sm:file:mb-0 sm:file:mr-3 sm:file:inline-flex sm:file:w-auto"
        />
        <p className="text-sm leading-6 text-slate-500">Belum ada file dipilih</p>
      </label>
    </div>
  );
}

function FilePreviewCard({ filename, preview, meta = "", warning = "" }) {
  return (
    <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{filename}</p>
          {meta ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{meta}</p>
          ) : null}
        </div>
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
          Preview
        </span>
      </div>

      {warning ? (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {warning}
        </p>
      ) : null}

      <pre className="mt-4 max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
        {preview}
      </pre>
    </div>
  );
}

function InlineInfo({ title, description }) {
  return (
    <div className="mt-4 w-full max-w-full min-w-0 overflow-hidden rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-100">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function OptionCard({ title, description, hint, isSelected, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={[
        "w-full min-w-0 max-w-full overflow-hidden",
        BASE_CARD_CLASS,
        isSelected ? SELECTED_CARD_CLASS : DEFAULT_CARD_CLASS,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold leading-6">{title}</p>
          <p className={`mt-2 text-sm leading-6 ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
            {description}
          </p>
        </div>
        <SelectionIndicator isSelected={isSelected} />
      </div>
      {hint ? (
        <span
          className={[
            "mt-4 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
            isSelected ? "bg-white/10 text-slate-100" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {hint}
        </span>
      ) : null}
    </button>
  );
}

function AgentSection({
  badge,
  title,
  description,
  selectedValue,
  onSelect,
  agentOptions,
  includeAuto = false,
}) {
  const cards = includeAuto
    ? [{ value: "auto", ...AGENT_CARD_COPY.auto }, ...agentOptions.map((agent) => ({
        value: agent.value,
        ...(AGENT_CARD_COPY[agent.value] || {
          title: agent.label,
          description: agent.description,
          tag: "Workflow",
        }),
      }))]
    : agentOptions.map((agent) => ({
        value: agent.value,
        ...(AGENT_CARD_COPY[agent.value] || {
          title: agent.label,
          description: agent.description,
          tag: "Workflow",
        }),
      }));

  return (
    <section className="w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-sky-100 bg-sky-50/50 p-4 shadow-sm sm:p-5 md:p-6">
      <SectionHeader badge={badge} title={title} description={description} badgeTone="sky" />
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <AgentCard
            key={card.value}
            title={card.title}
            description={card.description}
            tag={card.tag}
            isSelected={selectedValue === card.value}
            onClick={() => onSelect(card.value)}
          />
        ))}
      </div>
    </section>
  );
}

function GenerationModeSelector({
  value,
  onChange,
  title,
  description,
  badgeText,
  helperText = "Hasil lebih pendek, fokus pada output inti, dan lebih aman dari output terpotong.",
}) {
  return (
    <div className="mt-5 w-full max-w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
          {badgeText}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <OptionCard
          title="Normal"
          description="Lebih detail"
          hint="Default"
          isSelected={value === "normal"}
          onClick={() => onChange("normal")}
        />
        <OptionCard
          title="Ringkas"
          description="Lebih aman dan padat"
          hint="Compact"
          isSelected={value === "compact"}
          onClick={() => onChange("compact")}
        />
      </div>

      <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        {helperText}
      </p>
    </div>
  );
}

function AgentCard({ title, description, tag, isSelected, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={[
        "w-full min-w-0 max-w-full overflow-hidden",
        BASE_CARD_CLASS,
        isSelected ? SELECTED_CARD_CLASS : DEFAULT_CARD_CLASS,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold leading-6">{title}</p>
          <p className={`mt-2 text-sm leading-6 ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
            {description}
          </p>
        </div>
        <SelectionIndicator isSelected={isSelected} />
      </div>
      {tag ? (
        <span
          className={[
            "mt-4 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
            isSelected ? "bg-white/10 text-slate-100" : "bg-slate-100 text-slate-600",
          ].join(" ")}
        >
          {tag}
        </span>
      ) : null}
    </button>
  );
}

function SelectionIndicator({ isSelected }) {
  return (
    <span
      className={[
        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
        isSelected ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-400",
      ].join(" ")}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3.5 8 2.5 2.5 6-6" />
      </svg>
    </span>
  );
}

function getBadgeClassName(tone) {
  if (tone === "sky") {
    return "inline-flex w-fit items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-sky-700";
  }

  return "inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-600";
}

function formatFileSize(sizeInBytes = 0) {
  if (!sizeInBytes) {
    return "0 KB";
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  return `${(sizeInBytes / 1024).toFixed(1)} KB`;
}

function Field({ label, required = false, ...props }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        {...props}
        className="block w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      />
    </label>
  );
}

function TextareaField({ label, required = false, ...props }) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        {...props}
        rows={5}
        className="block min-h-32 w-full max-w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200"
      />
    </label>
  );
}
