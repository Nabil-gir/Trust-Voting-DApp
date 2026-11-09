import type { Metadata } from "next";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Trust — Chaque voix compte",
  description: "Une application de vote sur Ethereum. Proposez, votez et consultez les résultats du scrutin en toute transparence.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><Providers>{children}</Providers></body></html>;
}
