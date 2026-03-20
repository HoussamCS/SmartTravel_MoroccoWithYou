import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./components/TopNav";

export const metadata: Metadata = {
  title: "Morocco With You",
  description: "Smart travel platform for Morocco"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <TopNav />
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
