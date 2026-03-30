"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const travelerTokenKey = "mwy_traveler_access_token";

const navLinks = [
  { href: "/experiences", label: "Experiences" },
  { href: "/group-trips", label: "Voyages de groupe" },
  { href: "/itineraries/new", label: "Mon itineraire" },
  { href: "/special-request", label: "Demande speciale" },
  { href: "/bookings", label: "Mes reservations" }
];

export default function TopNav() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(travelerTokenKey);
    setLoggedIn(Boolean(token));
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem(travelerTokenKey);
    setLoggedIn(false);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-atlas/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-black text-atlas">
          <span className="rounded-full bg-atlas px-2 py-0.5 text-xs font-semibold text-white">MWY</span>
          Morocco With You
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                pathname === link.href
                  ? "bg-atlas text-white"
                  : "text-slate-600 hover:bg-atlas/10 hover:text-atlas"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {loggedIn ? (
            <>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Connecte
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-600"
              >
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-full border border-atlas px-4 py-2 text-xs font-semibold text-atlas hover:bg-atlas hover:text-white"
              >
                Connexion
              </Link>
              <Link
                href="/auth/register"
                className="rounded-full bg-warm px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Inscription
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-full border border-slate-200 p-2 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span className="block h-0.5 w-5 bg-slate-700 transition-all" />
          <span className="mt-1 block h-0.5 w-5 bg-slate-700" />
          <span className="mt-1 block h-0.5 w-5 bg-slate-700" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 md:hidden">
          <nav className="mt-3 grid gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  pathname === link.href
                    ? "bg-atlas text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            {loggedIn ? (
              <button
                onClick={handleLogout}
                className="flex-1 rounded-full border border-red-200 py-2 text-sm font-semibold text-red-600"
              >
                Deconnexion
              </button>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="flex-1 rounded-full border border-atlas py-2 text-center text-sm font-semibold text-atlas">
                  Connexion
                </Link>
                <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="flex-1 rounded-full bg-warm py-2 text-center text-sm font-semibold text-white">
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
