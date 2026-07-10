import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { Providers } from "./providers";
import { ConnectControls } from "@/components/ConnectControls";

export const metadata: Metadata = {
  title: "Aegis Protocol",
  description: "AI-verified milestone escrow on ERC-7579 smart accounts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <header className="border-b border-zinc-800">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tracking-tight">Aegis</span>
                <span className="text-xs uppercase tracking-widest text-zinc-500">
                  milestone escrow
                </span>
              </Link>
              <nav className="flex items-center gap-6 text-sm text-zinc-400">
                <Link href="/escrows" className="hover:text-zinc-100">
                  Escrows
                </Link>
                <Link href="/escrows/new" className="hover:text-zinc-100">
                  New escrow
                </Link>
                <ConnectControls />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
