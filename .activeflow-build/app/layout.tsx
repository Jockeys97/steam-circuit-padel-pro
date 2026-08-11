import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ActiveFlow — Integration Workbench",
  description: "A portfolio capstone that turns practical experience with apps, operations software, APIs, n8n and AI into three executable integration scenarios.",
  metadataBase: new URL("https://activeflow-alessio.jockeys97.chatgpt.site"),
  openGraph: {
    title: "ActiveFlow — Integration Workbench",
    description: "Apps → Operations → Automation → AI. Three executable integration scenarios built from practical experience.",
    images: [{ url: "/og.png", width: 1734, height: 908, alt: "ActiveFlow integration workflow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ActiveFlow — Integration Workbench",
    description: "A portfolio capstone for systems integration, workflow automation and human-controlled AI.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
