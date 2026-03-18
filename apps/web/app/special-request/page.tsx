"use client";

import { FormEvent, useMemo, useState } from "react";

type RequestState = "idle" | "loading" | "success" | "error";

const apiBaseDefault = "http://localhost:4000/api/v1";
const formId = "special-request-form";

export default function SpecialRequestPage() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBaseDefault, []);
  const [state, setState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("loading");
    setMessage("");

    const form = new FormData(event.currentTarget);
    const payload = {
      eventType: String(form.get("eventType") ?? ""),
      date: String(form.get("date") ?? ""),
      budget: Number(form.get("budget") ?? 0),
      peopleCount: Number(form.get("peopleCount") ?? 1),
      message: String(form.get("message") ?? ""),
      requesterName: String(form.get("requesterName") ?? ""),
      requesterMail: String(form.get("requesterMail") ?? "")
    };

    try {
      const response = await fetch(`${apiBase}/event-requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("request failed");
      }

      setState("success");
      setMessage("Votre demande a ete envoyee a notre equipe. Reponse sous 24h.");
      event.currentTarget.reset();
    } catch {
      setState("error");
      setMessage("Impossible d'envoyer la demande pour le moment. Merci de reessayer.");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-atlas/20 bg-atlas p-6 text-white shadow-2xl md:p-8">
          <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-dune">
            Demande speciale
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
            Dites-nous ce que vous voulez organiser, puis envoyez votre demande en un clic.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 md:text-lg">
            Mariage, anniversaire, corporate, surprise romantique ou voyage sur mesure: notre equipe MWY construit la reponse selon votre date, votre budget et votre nombre d'invites.
          </p>

          <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-dune">Action principale</p>
                <p className="mt-1 text-sm text-white/75">Le bouton d'envoi reste visible en haut et en bas de la page.</p>
              </div>
              <button
                type="submit"
                form={formId}
                disabled={state === "loading"}
                className="rounded-full bg-dune px-5 py-3 text-sm font-semibold text-atlas transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state === "loading" ? "Envoi..." : "Envoyer ma demande"}
              </button>
            </div>
          </div>

          <ul className="mt-8 grid gap-3 text-sm text-white/80 sm:grid-cols-3">
            <li className="rounded-2xl border border-white/10 bg-white/10 p-4">1. Vous decrivez le besoin</li>
            <li className="rounded-2xl border border-white/10 bg-white/10 p-4">2. L'equipe MWY analyse budget et date</li>
            <li className="rounded-2xl border border-white/10 bg-white/10 p-4">3. Vous recevez une proposition adaptee</li>
          </ul>
        </div>

        <section className="rounded-[2rem] border border-atlas/20 bg-white/85 p-6 shadow-xl backdrop-blur md:p-8">
          <h2 className="text-2xl font-black text-atlas">Formulaire</h2>
          <p className="mt-2 text-sm text-slate-700">
            Remplissez les informations essentielles. Le bouton de validation est aussi fixe en bas sur mobile.
          </p>

          <form id={formId} onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
            <input name="eventType" required placeholder="Type d'evenement" className="rounded-xl border border-slate-300 p-3" />
            <input name="date" type="date" required className="rounded-xl border border-slate-300 p-3" />
            <input name="budget" type="number" min={0} placeholder="Budget (MAD)" className="rounded-xl border border-slate-300 p-3" />
            <input name="peopleCount" type="number" min={1} required placeholder="Nombre de personnes" className="rounded-xl border border-slate-300 p-3" />
            <input name="requesterName" placeholder="Votre nom" className="rounded-xl border border-slate-300 p-3 sm:col-span-1" />
            <input name="requesterMail" type="email" placeholder="Votre email" className="rounded-xl border border-slate-300 p-3 sm:col-span-1" />
            <textarea
              name="message"
              required
              placeholder="Decrivez votre demande"
              className="min-h-40 rounded-xl border border-slate-300 p-3 sm:col-span-2"
            />
            <button
              type="submit"
              disabled={state === "loading"}
              className="hidden rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60 sm:col-span-2 sm:inline-flex sm:items-center sm:justify-center"
            >
              {state === "loading" ? "Envoi..." : "Envoyer la demande"}
            </button>
          </form>

          {message ? (
            <p className={`mt-4 text-sm ${state === "success" ? "text-emerald-700" : "text-red-600"}`}>{message}</p>
          ) : null}
        </section>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-atlas/15 bg-white/95 p-4 shadow-2xl backdrop-blur sm:hidden">
        <button
          type="submit"
          form={formId}
          disabled={state === "loading"}
          className="w-full rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {state === "loading" ? "Envoi..." : "Envoyer la demande"}
        </button>
      </div>
    </main>
  );
}
