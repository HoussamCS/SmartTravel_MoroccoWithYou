"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

type IntentState = "idle" | "loading" | "success" | "error";

const apiBaseDefault = "http://localhost:4000/api/v1";
const travelerTokenKey = "mwy_traveler_access_token";

function CheckoutForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required"
    });

    if (result.error) {
      setMessage(result.error.message ?? "Paiement refuse. Merci de verifier vos informations.");
      setIsSubmitting(false);
      return;
    }

    setMessage("Paiement confirme. Le statut de votre booking sera mis a jour via webhook Stripe.");
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Paiement en cours..." : "Confirmer le paiement"}
      </button>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      <p className="text-xs text-slate-500">Booking: {bookingId}</p>
    </form>
  );
}

function CheckoutPageBody() {
  const params = useSearchParams();
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseDefault, []);
  const bookingId = params.get("bookingId") ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

  const [token, setToken] = useState("");
  const [intentState, setIntentState] = useState<IntentState>("idle");
  const [intentMessage, setIntentMessage] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");

  const stripePromise = useMemo(() => {
    if (!publishableKey) {
      return null;
    }
    return loadStripe(publishableKey);
  }, [publishableKey]);

  useEffect(() => {
    const storedToken = localStorage.getItem(travelerTokenKey) ?? "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!bookingId || !token || !publishableKey) {
      return;
    }

    let cancelled = false;
    const loadIntent = async () => {
      setIntentState("loading");
      setIntentMessage("");

      try {
        const response = await fetch(`${apiBase}/payments/intent`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ bookingId, currency: "mad" })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error((data as { message?: string }).message ?? "Impossible de creer le payment intent.");
        }

        if (cancelled) {
          return;
        }

        const secret = String((data as { clientSecret?: string }).clientSecret ?? "");
        if (!secret) {
          throw new Error("Client secret manquant dans la reponse Stripe.");
        }

        setPaymentIntentId(String((data as { paymentIntentId?: string }).paymentIntentId ?? ""));
        setClientSecret(secret);
        setIntentState("success");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setIntentState("error");
        setIntentMessage(error instanceof Error ? error.message : "Erreur de preparation du paiement.");
      }
    };

    void loadIntent();

    return () => {
      cancelled = true;
    };
  }, [apiBase, bookingId, publishableKey, token]);

  if (!bookingId) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-3xl font-black text-red-900">Booking manquant</h1>
          <p className="mt-3 text-sm text-red-800">Ajoutez ?bookingId=... dans l'URL pour ouvrir le checkout.</p>
          <Link href="/experiences" className="mt-5 inline-block rounded-full border border-red-900 px-5 py-3 text-sm font-semibold text-red-900">
            Retour aux experiences
          </Link>
        </section>
      </main>
    );
  }

  if (!publishableKey) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <h1 className="text-3xl font-black text-amber-900">Stripe non configure</h1>
          <p className="mt-3 text-sm text-amber-800">Definissez NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY dans vos variables d'environnement web.</p>
        </section>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 md:px-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-atlas">Connexion requise</h1>
          <p className="mt-3 text-sm text-slate-700">Connectez-vous pour charger votre token voyageur avant le paiement.</p>
          <Link href="/auth/login" className="mt-5 inline-block rounded-full bg-atlas px-5 py-3 text-sm font-semibold text-white">
            Ouvrir la connexion voyageur
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
        <Link href="/" className="hover:text-atlas">Accueil</Link>
        <span>/</span>
        <span className="text-atlas">Checkout Stripe</span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-atlas/20 bg-atlas p-6 text-white shadow-2xl md:p-8">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-dune">
            Paiement securise
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">Finaliser votre reservation</h1>
          <p className="mt-4 text-sm leading-7 text-white/85">
            Cette page cree un PaymentIntent depuis l'API SmartTravel puis confirme le paiement avec Stripe Elements.
          </p>

          <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-white/70">Booking ID</p>
            <p className="mt-1 break-all font-mono text-dune">{bookingId}</p>
            {paymentIntentId ? (
              <>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/70">PaymentIntent ID</p>
                <p className="mt-1 break-all font-mono text-dune">{paymentIntentId}</p>
              </>
            ) : null}
          </div>
        </div>

        <section className="rounded-[2rem] border border-atlas/20 bg-white/85 p-6 shadow-xl backdrop-blur md:p-8">
          <h2 className="text-2xl font-black text-atlas">Carte bancaire</h2>
          <p className="mt-2 text-sm text-slate-700">Saisissez vos informations de paiement pour confirmer la reservation.</p>

          {intentState === "loading" ? <p className="mt-6 text-sm text-slate-600">Preparation du paiement...</p> : null}
          {intentState === "error" ? <p className="mt-6 text-sm text-red-600">{intentMessage}</p> : null}

          {intentState === "success" && clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm bookingId={bookingId} />
            </Elements>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <div className="animate-pulse rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-sm">
          <div className="h-6 w-32 rounded bg-slate-200" />
          <div className="mt-4 h-10 w-64 rounded bg-slate-200" />
        </div>
      </main>
    }>
      <CheckoutPageBody />
    </Suspense>
  );
}