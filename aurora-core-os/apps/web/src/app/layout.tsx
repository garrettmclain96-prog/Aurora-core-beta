import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aurora Core OS",
  description: "Hybrid cognitive engine for energy, biometrics, and environment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-mono">
        <header className="border-b border-line/60 px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md border border-teal/60 grid place-items-center text-teal text-xs">AC</div>
            <div>
              <div className="text-teal glow font-bold tracking-widest">AURORA CORE</div>
              <div className="text-[10px] text-teal/60 -mt-1">v2.0 · McLain Systems</div>
            </div>
          </Link>
          <nav className="flex gap-5 text-xs uppercase tracking-widest">
            <Link href="/" className="hover:text-teal">Console</Link>
            <Link href="/chat" className="hover:text-teal">Chat</Link>
            <Link href="/onboarding" className="hover:text-teal">Onboarding</Link>
          </nav>
        </header>
        <main className="px-6 py-6 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
