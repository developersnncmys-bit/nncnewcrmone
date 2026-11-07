import type { Metadata } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import { BRAND } from "@/lib/utils";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const mono = JetBrains_Mono({ variable: "--font-mono-jb", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: BRAND, template: `%s · ${BRAND}` },
  description: "NNC CRM: Travel CRM, Sales CRM and HRMS.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${figtree.variable} ${mono.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
