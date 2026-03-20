"use client";

import Link from "next/link";
import { FormEvent, useCallback, useMemo, useState } from "react";

type RegisterState = "idle" | "loading" | "success" | "error";

const apiBaseDefault = "http://localhost:4000/api/v1";
const travelerTokenKey = "mwy_traveler_access_token";

export default function TravelerRegisterPage() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseDefault, []);
  const [state, setState] = useState<RegisterState>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (password !== confirm) {
      setState("error");
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    const payload = {
      email: String(form.get("email") ?? ""),
      password,
      name: String(form.get("name") ?? "")
    };

    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "Inscription impossible.");
      }

      const token = String((data as { accessToken?: string }).accessToken ?? "").trim();
      if (token) {
        localStorage.setItem(travelerTokenKey, token);
      }

      setState("success");
      setMessage("Compte cree avec succes. Vous etes maintenant connecte.");
      event.currentTarget.reset();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erreur lors de l'inscription.");
    }
  }, [apiBase]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600">
        <Link href="/" className="hover:text-atlas">Accueil</Link>
        <span>/</span>
        <span className="text-atlas">Inscription voyageur</span>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-atlas/20 bg-atlas p-6 text-white shadow-2xl md:p-8">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-dune">
            Nouveau voyageur
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
            Creez votre compte et commencez a explorer le Maroc.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/85">
            Un compte gratuit vous permet de reserver des experiences, suivre vos bookings et recevoir des offres personnalisees.
          </p>

          <ul className="mt-6 grid gap-3 text-sm text-white/85">
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">1. Remplissez le formulaire en quelques secondes</li>
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">2. Votre token d&apos;acces est genere automatiquement</li>
            <li className="rounded-2xl border border-white/15 bg-white/10 p-4">3. Reservez et payez directement depuis la plateforme</li>
          </ul>

          <p className="mt-8 border-t border-white/20 pt-6 text-sm text-white/70">
            Deja un compte ?{" "}
            <Link href="/auth/login" className="font-semibold text-dune hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <section className="rounded-[2rem] border border-atlas/20 bg-white/85 p-6 shadow-xl backdrop-blur md:p-8">
          <h2 className="text-2xl font-black text-atlas">Inscription</h2>
          <p className="mt-2 text-sm text-slate-700">Tous les champs sont requis.</p>

          {state === "success" ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-800">{message}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/experiences" className="rounded-full bg-atlas px-4 py-2 text-xs font-semibold text-white">
                  Explorer les experiences
                </Link>
                <Link href="/bookings/status" className="rounded-full border border-atlas px-4 py-2 text-xs font-semibold text-atlas">
                  Mes reservations
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <div className="grid gap-1">
                <label htmlFor="name" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nom complet</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  className="rounded-xl border border-slate-300 p-3 text-sm focus:border-atlas focus:outline-none"
                />
              </div>

              <div className="grid gap-1">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="rounded-xl border border-slate-300 p-3 text-sm focus:border-atlas focus:outline-none"
                />
              </div>

              <div className="grid gap-1 sm:grid-cols-2">
                <div className="grid gap-1">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mot de passe</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="rounded-xl border border-slate-300 p-3 text-sm focus:border-atlas focus:outline-none"
                  />
                </div>
                <div className="grid gap-1">
                  <label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Confirmer</label>
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="rounded-xl border border-slate-300 p-3 text-sm focus:border-atlas focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={state === "loading"}
                className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === "loading" ? "Creation du compte..." : "Creer mon compte"}
              </button>

              {state === "error" && message ? (
                <p className="text-sm text-red-600">{message}</p>
              ) : null}
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
