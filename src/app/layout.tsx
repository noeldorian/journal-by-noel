import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeSync } from "@/components/theme-sync";

// A deliberately non-default pairing — Instrument Sans for UI text, IBM Plex
// Mono for every figure (prices, P&L, balances). Most trading journals ship
// whatever their framework's starter template includes (Inter/Geist); this
// is one of the ways this app is meant to not look like the rest of them.
const instrumentSans = Instrument_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Journal by Noel",
  description: "A modern futures trading journal and performance analytics platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      data-accent="purple"
      className={`${instrumentSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-text-primary">
        <AuthProvider>
          <ThemeSync />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
