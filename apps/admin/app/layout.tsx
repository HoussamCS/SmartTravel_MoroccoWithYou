import "./globals.css";
import Link from "next/link";

const navLinks = [
  { href: "/", label: "🏠 Dashboard" },
  { href: "/providers", label: "🏪 Prestataires" },
  { href: "/itineraries", label: "🗺️ Itinéraires" },
  { href: "/users", label: "👥 Utilisateurs" },
  { href: "/commissions", label: "💰 Commissions" },
  { href: "/group-trips", label: "✈️ Voyages Groupe" },
  { href: "/event-requests", label: "📋 Demandes Spéciales" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <title>Morocco With You — Back-office</title>
        <meta name="description" content="Back-office Morocco With You" />
      </head>
      <body style={{ margin: 0, display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
        {/* Sidebar */}
        <nav style={{
          width: 220, background: "#1a1a2e", color: "#fff", padding: "24px 0", flexShrink: 0,
          display: "flex", flexDirection: "column", gap: 4
        }}>
          <div style={{ padding: "0 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 8 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#f59e0b", margin: 0 }}>MWY Admin</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>Morocco With You</p>
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "block", padding: "9px 20px", fontSize: 13, color: "rgba(255,255,255,0.75)",
                textDecoration: "none", transition: "background 0.15s"
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {/* Main content */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
