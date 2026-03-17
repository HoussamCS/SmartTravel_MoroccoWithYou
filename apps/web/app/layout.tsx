import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morocco With You",
  description: "Smart travel platform for Morocco"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
