"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type LookupState = "idle" | "loading" | "success" | "error";

const apiBaseDefault = "http://localhost:4000/api/v1";
const travelerTokenKey = "mwy_traveler_access_token";

type BookingResponse = {
  id: string;
  status: string;
  date: string;
  pax: number;
  totalPrice: number;
  commissionTotal: number;
  paymentIntent?: string | null;
};

export default function BookingStatusPage() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseDefault, []);
  const searchParams = useSearchParams();
  const [state, setState] = useState<LookupState>("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [bookingIdInput, setBookingIdInput] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(travelerTokenKey) ?? "";
    if (stored) {
      setToken(stored);
    }

    const fromQuery = searchParams.get("bookingId")?.trim() ?? "";
    if (fromQuery) {
      setBookingIdInput(fromQuery);
    }
  }, [searchParams]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    setMessage("");
    setBooking(null);

    const form = new FormData(event.currentTarget);
    const bookingId = (String(form.get("bookingId") ?? "").trim() || bookingIdInput.trim());
    const accessToken = token.trim();

    if (!bookingId) {
      setState("error");
      setMessage("Veuillez saisir un booking ID.");
      return;
    }

    if (!accessToken) {
      setState("error");
      setMessage("Token manquant. Connectez-vous via la page voyageur.");
      return;
    }

    localStorage.setItem(travelerTokenKey, accessToken);

    try {
      const response = await fetch(`${apiBase}/bookings/${bookingId}`, {
        headers: {
          "authorization": `Bearer ${accessToken}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "Impossible de charger le statut.");
      }

      setBooking(data as BookingResponse);
      setState("success");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erreur lors de la verification du booking.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
        <Link href="/" className="hover:text-atlas">Accueil</Link>
        <span>/</span>
        <span className="text-atlas">Suivi de reservation</span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-atlas/20 bg-atlas p-6 text-white shadow-2xl md:p-8">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-dune">
            Suivi voyageur
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">Verifier le statut de votre booking</h1>
          <p className="mt-4 text-sm leading-7 text-white/85">
            Saisissez votre identifiant de reservation pour voir son statut apres paiement (PENDING, CONFIRMED, CANCELLED).
          </p>

          <ul className="mt-6 grid gap-3 text-sm text-white/85">
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">1. Recuperez votre booking ID depuis la confirmation</li>
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">2. Verifiez que votre token voyageur est actif</li>
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">3. Consultez l'etat de reservation en temps reel</li>
          </ul>
        </div>

        <section className="rounded-[2rem] border border-atlas/20 bg-white/85 p-6 shadow-xl backdrop-blur md:p-8">
          <h2 className="text-2xl font-black text-atlas">Recherche</h2>
          <p className="mt-2 text-sm text-slate-700">Le token est precharge si vous avez utilise la connexion voyageur.</p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1">
              <label htmlFor="bookingId" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Booking ID</label>
              <input
                id="bookingId"
                name="bookingId"
                required={!bookingIdInput}
                placeholder="uuid..."
                value={bookingIdInput}
                onChange={(event) => setBookingIdInput(event.target.value)}
                className="rounded-xl border border-slate-300 p-3 text-sm font-mono focus:border-atlas focus:outline-none"
              />
            </div>

            <div className="grid gap-1">
              <label htmlFor="token" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Token d'acces (JWT)</label>
              <textarea
                id="token"
                name="token"
                rows={3}
                required
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="rounded-xl border border-slate-300 p-3 font-mono text-xs focus:border-atlas focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={state === "loading"}
              className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "loading" ? "Verification..." : "Verifier le statut"}
            </button>

            {message ? <p className="text-sm text-red-600">{message}</p> : null}
          </form>

          {booking ? (
            <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Statut</p>
                <p className="mt-1 text-lg font-black text-atlas">{booking.status}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Date</p>
                  <p className="mt-1 text-sm text-slate-900">{new Date(booking.date).toLocaleString("fr-MA")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Voyageurs</p>
                  <p className="mt-1 text-sm text-slate-900">{booking.pax}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Total</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(booking.totalPrice)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">PaymentIntent</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-900">{booking.paymentIntent ?? "Aucun"}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">
              Pas encore connecte ?
              <Link href="/auth/login" className="ml-1 font-semibold text-atlas hover:underline">
                Ouvrir la connexion voyageur
              </Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}