"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type LoginState = "idle" | "loading" | "success" | "error";

const apiBaseDefault = "http://localhost:4000/api/v1";
const travelerTokenKey = "mwy_traveler_access_token";

export default function TravelerLoginPage() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseDefault, []);
  const [state, setState] = useState<LoginState>("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? "")
    };

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "Connexion impossible.");
      }

      const token = String((data as { accessToken?: string }).accessToken ?? "").trim();
      if (!token) {
        throw new Error("Aucun access token recu depuis l'API.");
      }

      localStorage.setItem(travelerTokenKey, token);
      setTokenPreview(`${token.slice(0, 20)}...${token.slice(-10)}`);
      setEmail(payload.email);
      setState("success");
      setMessage("Connexion reussie. Votre token voyageur est enregistre pour les reservations.");
      event.currentTarget.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Connexion impossible pour le moment.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
        <Link href="/" className="hover:text-atlas">Accueil</Link>
        <span>/</span>
        <span className="text-atlas">Connexion voyageur</span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-atlas/20 bg-atlas p-6 text-white shadow-2xl md:p-8">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-dune">
            Espace voyageur
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
            Connectez-vous une fois, reservez plus vite.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/85">
            Cette connexion stocke votre access token localement dans le navigateur pour eviter de le copier/coller sur chaque booking.
          </p>

          <ul className="mt-6 grid gap-3 text-sm text-white/85">
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">1. Entrez votre email et mot de passe</li>
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">2. Le token JWT est enregistre localement</li>
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">3. Les formulaires de reservation se remplissent automatiquement</li>
          </ul>
        </div>

        <section className="rounded-[2rem] border border-atlas/20 bg-white/85 p-6 shadow-xl backdrop-blur md:p-8">
          <h2 className="text-2xl font-black text-atlas">Connexion</h2>
          <p className="mt-2 text-sm text-slate-700">
            Utilisez un compte voyageur cree via l'API d'authentification.
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="rounded-xl border border-slate-300 p-3 text-sm focus:border-atlas focus:outline-none"
              />
            </div>

            <div className="grid gap-1">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="rounded-xl border border-slate-300 p-3 text-sm focus:border-atlas focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={state === "loading"}
              className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "loading" ? "Connexion..." : "Se connecter"}
            </button>

            {message ? (
              <p className={`text-sm ${state === "error" ? "text-red-600" : "text-emerald-700"}`}>{message}</p>
            ) : null}
          </form>

          {state === "success" ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Session active</p>
              <p className="mt-2 text-sm text-emerald-900">Compte: {email}</p>
              <p className="mt-1 break-all font-mono text-xs text-emerald-900">Token: {tokenPreview}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/experiences" className="rounded-full bg-atlas px-4 py-2 text-xs font-semibold text-white">Aller au catalogue</Link>
                <Link href="/bookings/new" className="rounded-full border border-atlas px-4 py-2 text-xs font-semibold text-atlas">Aller a la reservation</Link>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}