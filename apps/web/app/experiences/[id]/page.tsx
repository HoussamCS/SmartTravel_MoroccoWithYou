import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryLabels, fetchProvider, formatMoney, unitLabels } from "../../../lib/catalog";

export default async function ExperienceDetailPage({ params }: { params: { id: string } }) {
  const providerState = await fetchProvider(params.id);

  if (providerState.notFound) {
    notFound();
  }

  const provider = providerState.data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
        <Link href="/" className="hover:text-atlas">Accueil</Link>
        <span>/</span>
        <Link href="/experiences" className="hover:text-atlas">Experiences</Link>
        {provider ? (
          <>
            <span>/</span>
            <span className="text-atlas">{provider.name}</span>
          </>
        ) : null}
      </div>

      {providerState.error || !provider ? (
        <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.18em] text-red-800">Fiche indisponible</p>
          <h1 className="mt-3 text-3xl font-black text-red-950">Impossible de charger cette experience</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-red-900">
            {providerState.error ?? "La fiche n'a pas pu etre recuperée pour le moment."} Tant que la base PostgreSQL reste offline,
            les details prestataires ne peuvent pas etre lus depuis l'API.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/experiences" className="rounded-full border border-red-900 px-5 py-3 text-sm font-semibold text-red-900">
              Retour au catalogue
            </Link>
            <Link href="/special-request" className="rounded-full bg-red-900 px-5 py-3 text-sm font-semibold text-white">
              Envoyer une demande manuelle
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-[2rem] border border-atlas/15 bg-white/80 shadow-xl backdrop-blur">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative min-h-[320px] bg-[linear-gradient(135deg,#0f3f52,#2d6e86_55%,#e7bb93)] p-8 text-white md:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_26%),linear-gradient(180deg,transparent,rgba(0,0,0,0.12))]" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex flex-wrap gap-3">
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                      {categoryLabels[provider.category]}
                    </span>
                    <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/85">
                      {provider.city}
                    </span>
                  </div>

                  <div className="mt-12 max-w-2xl">
                    <h1 className="text-4xl font-black leading-tight md:text-5xl">{provider.name}</h1>
                    <p className="mt-5 text-base leading-7 text-white/85 md:text-lg">{provider.description}</p>
                  </div>
                </div>
              </div>

              <aside className="grid gap-4 bg-white p-6 md:p-8">
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Coordonnees</p>
                  <p className="mt-3 text-lg font-bold text-atlas">{provider.city}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {typeof provider.location?.lat === "number" && typeof provider.location?.lng === "number"
                      ? `${provider.location.lat.toFixed(4)}, ${provider.location.lng.toFixed(4)}`
                      : "Position non communiquee"}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Statut</p>
                  <p className="mt-3 text-lg font-bold text-atlas">{provider.isActive ? "Disponible au catalogue" : "Temporairement indisponible"}</p>
                  <p className="mt-1 text-sm text-slate-600">Prestataire synchronise depuis le back-office SmartTravel.</p>
                </article>

                <div className="flex flex-col gap-3">
                  <Link href="/special-request" className="rounded-full bg-warm px-5 py-3 text-center text-sm font-semibold text-white">
                    Demander cette experience
                  </Link>
                  <Link href="/experiences" className="rounded-full border border-atlas px-5 py-3 text-center text-sm font-semibold text-atlas">
                    Retour au catalogue
                  </Link>
                </div>
              </aside>
            </div>
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-sm md:p-8">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Prestations</p>
              <h2 className="mt-3 text-3xl font-black text-atlas">Services proposes</h2>
              <div className="mt-6 grid gap-4">
                {provider.services.length > 0 ? (
                  provider.services.map((service) => (
                    <article key={service.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{service.label}</h3>
                          <p className="mt-2 text-sm text-slate-600">
                            Commission plateforme incluse: {formatMoney(service.commissionAmount)}.
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tarif public</p>
                            <p className="mt-1 text-2xl font-black text-atlas">{formatMoney(service.pricePublic)}</p>
                            <p className="text-xs text-slate-500">{unitLabels[service.unit]}</p>
                          </div>
                          <Link
                            href={`/bookings/new?serviceId=${service.id}&serviceLabel=${encodeURIComponent(service.label)}&providerId=${provider.id}&providerName=${encodeURIComponent(provider.name)}&unit=${service.unit}&price=${service.pricePublic}`}
                            className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
                          >
                            Reserver
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6">
                    <h3 className="text-lg font-bold text-atlas">Aucun service attache pour l'instant</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Le partenaire existe dans le catalogue mais aucune prestation exploitable n'est encore exposee. Dans ce cas, la demande speciale reste le meilleur point d'entree.
                    </p>
                  </article>
                )}
              </div>
            </div>

            <aside className="rounded-[2rem] border border-atlas/20 bg-atlas p-6 shadow-xl text-white md:p-8">
              <p className="text-sm uppercase tracking-[0.18em] text-white/70">Reserver une prestation</p>
              <h2 className="mt-3 text-3xl font-black text-white">Comment ca marche</h2>

              <ul className="mt-6 grid gap-3 text-sm text-white/85">
                <li className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-dune">Etape 1</span>
                  <p className="mt-1">Choisissez un service et cliquez sur <strong>Reserver</strong>.</p>
                </li>
                <li className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-dune">Etape 2</span>
                  <p className="mt-1">Indiquez la date, le nombre de personnes et votre token d'acces.</p>
                </li>
                <li className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-dune">Etape 3</span>
                  <p className="mt-1">Confirmez — votre booking est cree instantanement et le paiement Stripe suit.</p>
                </li>
              </ul>

              <div className="mt-6 flex flex-col gap-3">
                <Link href="/special-request" className="rounded-full border border-white/25 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10">
                  Demande sur mesure
                </Link>
              </div>
            </aside>
          </section>
        </>
      )}
    </main>
  );
}