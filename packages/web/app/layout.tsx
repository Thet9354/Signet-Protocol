import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Link from "next/link";

import "./globals.css";
import { Providers } from "./providers";
import { ConnectControls } from "@/components/ConnectControls";
import { Seal } from "@/components/Seal";

// Display: characterful grotesque. Body: humanist sans. Mono: engineering ledger.
// Deliberately NOT Inter/Roboto/system-ui.
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Signet Protocol — AI-verified milestone escrow",
  description:
    "Milestone escrow released by a 2-of-3 seal among the funder, the contributor's smart account, and an AI oracle. Live on Base Sepolia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${plexMono.variable}`}>
      <body className="min-h-screen">
        <Providers>
          <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
              <Link href="/" className="group flex items-center gap-2.5">
                <Seal size={26} className="transition-transform duration-300 group-hover:rotate-[120deg]" />
                <span className="flex items-baseline gap-1.5">
                  <span className="font-display text-[1.05rem] font-semibold tracking-tight">Signet</span>
                  <span className="t-label">Protocol</span>
                </span>
              </Link>
              <nav className="flex items-center gap-1 sm:gap-2">
                <NavLink href="/escrows">Escrows</NavLink>
                <NavLink href="/escrows/new">New escrow</NavLink>
                <span className="mx-1 h-5 w-px bg-line" />
                <ConnectControls />
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">{children}</main>

          <footer className="mt-24 border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-ink3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <Seal size={18} />
                <span>Signet Protocol · 2-of-3 milestone escrow</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge" style={{ color: "var(--color-moss)", borderColor: "color-mix(in oklab, var(--color-moss) 35%, transparent)" }}>
                  <span className="badge-dot" />
                  Live on Base Sepolia
                </span>
                <a
                  className="underline decoration-line2 underline-offset-4 transition-colors hover:text-ink"
                  href="https://sepolia.basescan.org/address/0xd3d8af1b7eb03a812052cda7b52a289ee38c5f67#code"
                  target="_blank"
                  rel="noreferrer"
                >
                  Verified contract ↗
                </a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-ink2 transition-colors hover:bg-card hover:text-ink"
    >
      {children}
    </Link>
  );
}
