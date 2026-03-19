import Link from "next/link";

const features = [
  {
    title: "Experiences locales",
    text: "Quad, hammam, ateliers artisanaux et excursions avec des partenaires verifies."
  },
  {
    title: "Reservations rapides",
    text: "Restaurants, activites et services en un seul checkout avec suivi de statut."
  },
  {
    title: "Travel planning",
    text: "Itineraires sur mesure selon budget, style de voyage et rythme personnel."
  },
  {
    title: "Voyages de groupe",
    text: "Rejoignez des departs planifies avec programme journalier et places restantes."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <section className="hero-grid rounded-3xl border border-atlas/20 bg-white/60 p-6 shadow-xl backdrop-blur md:p-10">
        <div className="max-w-3xl animate-[fadeIn_700ms_ease-out]">
          <p className="inline-block rounded-full bg-atlas px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            Morocco With You
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-atlas md:text-6xl">
            Organisez votre sejour au Maroc, du premier clic jusqu'au retour.
          </h1>
          <p className="mt-5 text-lg text-slate-700">
            Une plateforme unique pour decouvrir, reserver et construire des aventures memorables a Marrakech, Fes, Agadir et au-dela.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/experiences"
              className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.02]"
            >
              Explorer les experiences
            </Link>
            <Link
              href="/special-request"
              className="rounded-full border border-atlas px-5 py-3 text-sm font-semibold text-atlas transition hover:bg-atlas hover:text-white"
            >
              Demander un travel planner
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {features.map((feature, index) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm"
            style={{ animation: `fadeIn 600ms ease-out ${index * 120}ms both` }}
          >
            <h2 className="text-xl font-bold text-atlas">{feature.title}</h2>
            <p className="mt-2 text-sm text-slate-700">{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-3xl border border-atlas/15 bg-atlas p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Nouveau dans le MVP</p>
            <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
              Le catalogue public est maintenant accessible avec navigation vers chaque prestataire.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/80 md:text-base">
              Vous pouvez parcourir les experiences actives, filtrer par ville ou categorie, puis ouvrir une fiche detail pour voir le positionnement du prestataire et ses services.
            </p>
          </div>
          <Link
            href="/experiences"
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-atlas transition hover:scale-[1.02]"
          >
            Ouvrir le catalogue
          </Link>
        </div>
      </section>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0);} }`}</style>
    </main>
  );
}
