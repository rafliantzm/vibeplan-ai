export const metadata = {
  title: "Pricing | VibePlan AI",
};

const PACKAGES = [
  {
    name: "Paket Starter",
    description: "Cocok untuk mencoba generate PRD dan roadmap coding skala kecil.",
  },
  {
    name: "Paket Pro",
    description: "Untuk workflow harian dengan file PRD lebih panjang dan iterasi lebih sering.",
  },
  {
    name: "Paket Ultimate",
    description: "Untuk project besar, banyak retry, dan kebutuhan token paling tinggi.",
  },
];

export default function PricingPage() {
  return (
    <div className="grid gap-6">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-600">
          Pricing
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Paket Token VibePlan AI
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          Halaman ini masih placeholder untuk MVP. Integrasi pembayaran belum
          aktif, tetapi struktur paket sudah disiapkan untuk simulasi alur SaaS.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PACKAGES.map((item) => (
          <article
            key={item.name}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-900">{item.name}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {item.description}
            </p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Pembayaran dan aktivasi token akan ditambahkan setelah fase MVP.
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
