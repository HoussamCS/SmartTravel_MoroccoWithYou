import Link from "next/link";
import { categoryLabels, fetchProviders, formatMoney, type ProviderCategory } from "../../lib/catalog";

const categoryOrder = Object.keys(categoryLabels) as ProviderCategory[];

const extractSingle = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

const parsePage = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export default async function ExperiencesPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const q = extractSingle(searchParams?.q).trim();
  const city = extractSingle(searchParams?.city).trim();
  const categoryValue = extractSingle(searchParams?.category).trim().toUpperCase();
  const page = parsePage(extractSingle(searchParams?.page));
  const category = categoryOrder.includes(categoryValue as ProviderCategory)
    ? (categoryValue as ProviderCategory)
    : undefined;

  const payload = await fetchProviders({ q, city, category, page, pageSize: 9 });
  const totalPages = Math.max(1, Math.ceil(payload.total / payload.pageSize));
  const hasFilters = Boolean(q || city || category);

  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    params.set("page", String(nextPage));
    return `/experiences?${params.toString()}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <section className="overflow-hidden rounded-[2rem] border border-atlas/15 bg-white/70 shadow-xl backdrop-blur">
        <div className="grid gap-8 md:grid-cols-[1.35fr_0.95fr]">
          <div className="p-6 md:p-10">
            <p className="inline-flex rounded-full bg-atlas px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
              Catalogue public
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-atlas md:text-6xl">
              Experiences, sejours et partenaires pour construire un voyage plus net, plus simple.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-slate-700 md:text-lg">
              Explorez les prestataires actifs par ville, categorie ou mot-cle. Chaque fiche centralise le contexte,
              les prestations disponibles et le bon point d'entree pour continuer vers une reservation ou une demande sur mesure.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium">
              {categoryOrder.map((entry) => {
                const active = category === entry;

                return (
                  <Link
                    key={entry}
                    href={`/experiences?category=${entry}`}
                    className={`rounded-full border px-4 py-2 transition ${
                      active ? "border-atlas bg-atlas text-white" : "border-atlas/20 bg-white text-atlas hover:border-atlas"
                    }`}
                  >
                    {categoryLabels[entry]}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="relative bg-atlas px-6 py-8 text-white md:px-8 md:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
            <div className="relative space-y-4">
              <p className="text-sm uppercase tracking-[0.18em] text-white/75">Vue rapide</p>
              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                <article className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/70">Resultats</p>
                  <p className="mt-2 text-3xl font-black">{payload.total}</p>
                </article>
                <article className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/70">Page</p>
                  <p className="mt-2 text-3xl font-black">{payload.page}</p>
                </article>
                <article className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.15em] text-white/70">Filtres</p>
                  <p className="mt-2 text-3xl font-black">{hasFilters ? "On" : "Off"}</p>
                </article>
              </div>
              <p className="max-w-md text-sm leading-6 text-white/80">
                Le catalogue reste lisible meme si l'API ou la base sont indisponibles: la page degrade proprement vers un etat vide explicite au lieu de casser le rendu.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm md:p-6">
        <form className="grid gap-4 md:grid-cols-[1.2fr_0.9fr_0.9fr_auto] md:items-end" action="/experiences" method="get">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Recherche
            <input
              name="q"
              defaultValue={q}
              placeholder="quad, rooftop, transfer, riad..."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-atlas"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Ville
            <input
              name="city"
              defaultValue={city}
              placeholder="Marrakech, Agadir..."
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-atlas"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Categorie
            <select
              name="category"
              defaultValue={category ?? ""}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-atlas"
            >
              <option value="">Toutes</option>
              {categoryOrder.map((entry) => (
                <option key={entry} value={entry}>
                  {categoryLabels[entry]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <button className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]">
              Filtrer
            </button>
            <Link
              href="/experiences"
              className="rounded-full border border-atlas px-5 py-3 text-sm font-semibold text-atlas transition hover:bg-atlas hover:text-white"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      {payload.error ? (
        <section className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
          <h2 className="text-lg font-bold">Catalogue momentanement indisponible</h2>
          <p className="mt-2 text-sm leading-6">
            L'API a repondu avec une erreur: {payload.error}. Tant que PostgreSQL n'est pas actif, les experiences ne peuvent pas etre listees depuis la base.
          </p>
          <div className="mt-4">
            <Link href="/special-request" className="text-sm font-semibold text-red-900 underline underline-offset-4">
              Basculer vers une demande manuelle
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {payload.data.map((provider, index) => (
          <article
            key={provider.id}
            className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/85 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            style={{ animation: `fadeIn 520ms ease-out ${index * 80}ms both` }}
          >
            <div className="relative min-h-48 bg-[linear-gradient(135deg,#0f3f52,#2d6e86_55%,#e5b38b)] p-6 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%)]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                    {categoryLabels[provider.category]}
                  </span>
                  <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/80">
                    {provider.city}
                  </span>
                </div>
                <div>
                  <h2 className="max-w-xs text-2xl font-black leading-tight">{provider.name}</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/80">
                    {provider.description.length > 140 ? `${provider.description.slice(0, 140)}...` : provider.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Prestataire actif</span>
                <span>
                  {typeof provider.location?.lat === "number" && typeof provider.location?.lng === "number"
                    ? `${provider.location.lat.toFixed(2)}, ${provider.location.lng.toFixed(2)}`
                    : "Coordonnees privees"}
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600">Consultez les services, tarifs et options depuis la fiche detail.</p>
                <Link
                  href={`/experiences/${provider.id}`}
                  className="rounded-full bg-atlas px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-warm"
                >
                  Voir la fiche
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!payload.error && payload.data.length === 0 ? (
        <section className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm">
          <h2 className="text-2xl font-black text-atlas">Aucun resultat pour cette combinaison</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Elargissez la recherche ou basculez vers une demande speciale si vous cherchez un montage sur mesure, un combiné ou une experience qui n'apparait pas encore dans le catalogue.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/experiences" className="rounded-full border border-atlas px-5 py-3 text-sm font-semibold text-atlas">
              Voir tout le catalogue
            </Link>
            <Link href="/special-request" className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white">
              Faire une demande manuelle
            </Link>
          </div>
        </section>
      ) : null}

      {payload.total > payload.pageSize ? (
        <nav className="mt-8 flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Page {payload.page} sur {totalPages}
          </p>
          <div className="flex gap-3">
            <Link
              href={buildPageHref(Math.max(1, payload.page - 1))}
              aria-disabled={payload.page <= 1}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                payload.page <= 1 ? "pointer-events-none bg-slate-100 text-slate-400" : "border border-atlas text-atlas"
              }`}
            >
              Precedent
            </Link>
            <Link
              href={buildPageHref(Math.min(totalPages, payload.page + 1))}
              aria-disabled={payload.page >= totalPages}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                payload.page >= totalPages ? "pointer-events-none bg-slate-100 text-slate-400" : "bg-atlas text-white"
              }`}
            >
              Suivant
            </Link>
          </div>
        </nav>
      ) : null}

      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white/75 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Passerelle suivante</p>
            <h2 className="mt-2 text-2xl font-black text-atlas md:text-3xl">Besoin d'un devis ou d'un montage multi-prestataires ?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Le catalogue couvre les experiences standardisees. Pour un parcours plus complexe, basculez vers la demande speciale et l'equipe peut consolider restauration, transport, activites et hebergement dans un seul flux.
            </p>
          </div>
          <Link href="/special-request" className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white">
            Ouvrir une demande speciale
          </Link>
        </div>
      </section>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </main>
  );
}