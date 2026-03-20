"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type BookingState = "idle" | "loading" | "success" | "error";
type PaymentState = "idle" | "loading" | "success" | "error";

const apiBaseDefault = "http://localhost:4000/api/v1";
const travelerTokenKey = "mwy_traveler_access_token";

function BookingForm() {
  const params = useSearchParams();
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseDefault, []);

  const serviceId = params.get("serviceId") ?? "";
  const serviceLabel = params.get("serviceLabel") ?? "Service";
  const providerId = params.get("providerId") ?? "";
  const providerName = params.get("providerName") ?? "Prestataire";
  const unit = params.get("unit") ?? "FIXED";
  const priceRaw = params.get("price") ?? "0";

  const [state, setState] = useState<BookingState>("idle");
  const [message, setMessage] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem(travelerTokenKey);
    if (storedToken) {
      setTokenInput(storedToken);
      setAuthToken(storedToken);
    }
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    setMessage("");
    setBookingId(null);
    setPaymentState("idle");
    setPaymentMessage("");
    setPaymentIntentId(null);
    setClientSecret(null);

    const form = new FormData(event.currentTarget);
    const token = tokenInput.trim();
    const date = String(form.get("date") ?? "");
    const pax = Number(form.get("pax") ?? 1);

    if (!token) {
      setState("error");
      setMessage("Veuillez saisir votre token d'acces (JWT). Vous pouvez en obtenir un via l'API /auth/login.");
      return;
    }

    if (!serviceId) {
      setState("error");
      setMessage("Parametre serviceId manquant. Revenez sur la fiche prestataire.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/bookings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ serviceId, date, pax })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "Erreur lors de la reservation.");
      }

      setBookingId((data as { id: string }).id);
      setTotalPrice((data as { totalPrice: number }).totalPrice);
      setAuthToken(token);
      localStorage.setItem(travelerTokenKey, token);
      setState("success");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Une erreur est survenue. Merci de reessayer.");
    }
  };

  const createPaymentIntent = async () => {
    if (!bookingId) {
      return;
    }

    if (!authToken) {
      setPaymentState("error");
      setPaymentMessage("Token d'acces indisponible. Refaite la reservation depuis le formulaire.");
      return;
    }

    setPaymentState("loading");
    setPaymentMessage("");

    try {
      const response = await fetch(`${apiBase}/payments/intent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({ bookingId, currency: "mad" })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "Erreur lors de la creation du payment intent.");
      }

      setPaymentIntentId((data as { paymentIntentId: string }).paymentIntentId);
      setClientSecret((data as { clientSecret: string | null }).clientSecret ?? null);
      setPaymentState("success");
      setPaymentMessage("Payment intent cree. Vous pouvez maintenant connecter le checkout Stripe.");
    } catch (err) {
      setPaymentState("error");
      setPaymentMessage(err instanceof Error ? err.message : "Creation du payment intent impossible.");
    }
  };

  if (state === "success" && bookingId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Confirmation</p>
          <h1 className="mt-3 text-3xl font-black text-emerald-900">Reservation confirmee</h1>
          <p className="mt-4 text-sm leading-7 text-emerald-800">
            Votre booking a ete cree avec succes. Conservez l&apos;identifiant ci-dessous pour le suivi et le paiement.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Booking ID</p>
              <p className="mt-2 break-all font-mono text-sm font-bold text-slate-900">{bookingId}</p>
            </div>
            {totalPrice !== null && (
              <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</p>
                <p className="mt-2 text-2xl font-black text-atlas">
                  {new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(totalPrice)}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={createPaymentIntent}
              disabled={paymentState === "loading"}
              className="rounded-full bg-atlas px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentState === "loading" ? "Creation payment intent..." : "Creer payment intent"}
            </button>
            <Link
              href={`/payments/checkout?bookingId=${bookingId}`}
              className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
            >
              Payer maintenant
            </Link>
            <Link
              href={`/experiences/${providerId}`}
              className="rounded-full border border-emerald-900 px-5 py-3 text-sm font-semibold text-emerald-900"
            >
              Retour a la fiche
            </Link>
            <Link
              href="/experiences"
              className="rounded-full bg-atlas px-5 py-3 text-sm font-semibold text-white"
            >
              Voir d&apos;autres experiences
            </Link>
          </div>

          {paymentMessage ? (
            <p className={`mt-4 text-sm ${paymentState === "error" ? "text-red-700" : "text-emerald-700"}`}>{paymentMessage}</p>
          ) : null}

          {paymentIntentId ? (
            <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-white p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">PaymentIntent ID</p>
                <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">{paymentIntentId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Client Secret</p>
                <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">{clientSecret ?? "Non retourne"}</p>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
        <Link href="/" className="hover:text-atlas">Accueil</Link>
        <span>/</span>
        <Link href="/experiences" className="hover:text-atlas">Experiences</Link>
        {providerId && (
          <>
            <span>/</span>
            <Link href={`/experiences/${providerId}`} className="hover:text-atlas">{providerName}</Link>
          </>
        )}
        <span>/</span>
        <span className="text-atlas">Reservation</span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-atlas/20 bg-atlas p-6 text-white shadow-2xl md:p-8">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-dune">
            Reservation
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
            {serviceLabel}
          </h1>
          <p className="mt-2 text-sm text-white/75">{providerName}</p>

          <div className="mt-6 rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">Tarif de base</p>
            <p className="mt-1 text-2xl font-black text-dune">
              {new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(Number(priceRaw))}
              <span className="ml-2 text-sm font-normal text-white/70">
                {unit === "PER_PERSON" ? "/ personne" : "forfait"}
              </span>
            </p>
            {unit === "PER_PERSON" && (
              <p className="mt-2 text-xs text-white/60">Le total sera calcule selon le nombre de personnes saisi.</p>
            )}
          </div>

          <ul className="mt-6 grid gap-3 text-sm text-white/85">
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <strong>Date souhaitee</strong> — choisissez le jour de la prestation.
            </li>
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <strong>Nombre de personnes</strong> — impacte le total si le tarif est par personne.
            </li>
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">
              <strong>Token JWT</strong> — obtenez-le via <code className="rounded bg-white/15 px-1 py-0.5 font-mono text-xs">POST /api/v1/auth/login</code>.
            </li>
          </ul>
        </div>

        <section className="rounded-[2rem] border border-atlas/20 bg-white/85 p-6 shadow-xl backdrop-blur md:p-8">
          <h2 className="text-2xl font-black text-atlas">Formulaire de reservation</h2>
          <p className="mt-2 text-sm text-slate-700">
            Remplissez les details ci-dessous pour confirmer votre booking.
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1">
              <label htmlFor="date" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Date souhaitee
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                className="rounded-xl border border-slate-300 p-3 text-sm focus:border-atlas focus:outline-none"
              />
            </div>

            <div className="grid gap-1">
              <label htmlFor="pax" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Nombre de personnes
              </label>
              <input
                id="pax"
                name="pax"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="rounded-xl border border-slate-300 p-3 text-sm focus:border-atlas focus:outline-none"
              />
            </div>

            <div className="grid gap-1">
              <label htmlFor="token" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Token d&apos;acces (JWT)
              </label>
              <textarea
                id="token"
                name="token"
                rows={3}
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                className="rounded-xl border border-slate-300 p-3 font-mono text-xs focus:border-atlas focus:outline-none"
              />
              <p className="text-xs text-slate-500">
                Obtenez votre token via <code className="rounded bg-slate-100 px-1 font-mono">POST /api/v1/auth/login</code> ou utilisez la{" "}
                <Link href="/auth/login" className="font-semibold text-atlas hover:underline">
                  page de connexion voyageur
                </Link>
                .
              </p>
            </div>

            <button
              type="submit"
              disabled={state === "loading"}
              className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "loading" ? "Reservation en cours..." : "Confirmer la reservation"}
            </button>

            {message && (
              <p className={`text-sm ${state === "error" ? "text-red-600" : "text-emerald-700"}`}>
                {message}
              </p>
            )}
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">
              Vous pouvez aussi envoyer une{" "}
              <Link href="/special-request" className="font-semibold text-atlas hover:underline">
                demande sur mesure
              </Link>{" "}
              si vous preferez etre contacte par notre equipe.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <div className="animate-pulse rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-sm">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="mt-4 h-10 w-64 rounded bg-slate-200" />
        </div>
      </main>
    }>
      <BookingForm />
    </Suspense>
  );
}
