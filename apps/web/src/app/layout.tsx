import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SideNav } from "@/components/SideNav";
import { PageTransition } from "@/components/PageTransition";
import { SmoothScroll } from "@/components/SmoothScroll";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// Display / UI headings — matches the reference site's typographic signature.
const display = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
// Editorial serif for the big hero / section titles — the reference's headline face.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumora — Real-time stablecoin payroll",
  description: "Real-time, yield-aware stablecoin payroll on Stellar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${display.variable} ${serif.variable}`}>
      <body className="font-sans">
        {/* Fixed page background (cream globe / network) */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/lumora-bg.png')] bg-cover bg-bottom bg-no-repeat" />
          <div className="absolute inset-0 bg-base/30" />
        </div>
        <SmoothScroll />
        <Providers>
          <SideNav />

          <main>
            <div className="mx-auto max-w-7xl px-6 pb-12 pt-24 lg:px-10">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
