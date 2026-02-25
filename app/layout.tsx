import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { FavoritesProvider } from "@/components/favorites-provider";
import { PoweredByBadge } from "@/components/powered-by";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReelFinder | Discover and Save Movies",
  description:
    "Search, explore, and save your favorite films powered by The Movie Database.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <FavoritesProvider>
          <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <SiteHeader />
            <main className="mx-auto max-w-6xl px-4 pb-16 pt-10">{children}</main>
            <PoweredByBadge />
          </div>
        </FavoritesProvider>
      </body>
    </html>
  );
}
