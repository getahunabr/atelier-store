import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

import "./globals.css";

// UI and body text. Mapped to font-sans in src/styles/tokens.css.
const sans = Inter({
  variable: "--font-sans-face",
  subsets: ["latin"],
});

// Editorial display headings only. Mapped to font-serif.
const serif = EB_Garamond({
  variable: "--font-serif-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Atelier Store", template: "%s | Atelier" },
  description: "Considered clothing and accessories, made in small runs and built to be kept.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
