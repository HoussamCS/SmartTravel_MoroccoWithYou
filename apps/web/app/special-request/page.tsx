"use client";

import { FormEvent, useMemo, useState } from "react";

type RequestState = "idle" | "loading" | "success" | "error";

const apiBaseDefault = "http://localhost:4000/api/v1";

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
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
      <section className="rounded-3xl border border-atlas/20 bg-white/80 p-6 shadow-xl backdrop-blur md:p-10">
        <h1 className="text-3xl font-black text-atlas md:text-4xl">Demande speciale</h1>
        <p className="mt-2 text-slate-700">
          Mariage, anniversaire, corporate ou demande sur mesure: partagez votre besoin et notre equipe MWY vous contacte.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
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
            className="min-h-32 rounded-xl border border-slate-300 p-3 sm:col-span-2"
          />
          <button
            type="submit"
            disabled={state === "loading"}
            className="rounded-full bg-warm px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60 sm:col-span-2"
          >
            {state === "loading" ? "Envoi..." : "Envoyer la demande"}
          </button>
        </form>

        {message ? (
          <p className={`mt-4 text-sm ${state === "success" ? "text-emerald-700" : "text-red-600"}`}>{message}</p>
        ) : null}
      </section>
    </main>
  );
}
