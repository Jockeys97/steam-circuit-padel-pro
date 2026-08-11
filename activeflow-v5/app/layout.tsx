import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ActiveFlow — Service Continuity Automation",
  description: "A live portfolio case study: n8n finds a qualified replacement, a human approves the proposal, and versioned sessions are updated with a complete audit trail.",
  metadataBase: new URL("https://activeflow-alessio.jockeys97.chatgpt.site"),
  openGraph: {
    title: "ActiveFlow — Keep the member journey running",
    description: "Try a live n8n service-continuity workflow with persistent data, explainable rules and human approval.",
    images: [{ url: "/og-v2.png", width: 1731, height: 909, alt: "ActiveFlow service continuity workflow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ActiveFlow — Service Continuity Automation",
    description: "A live n8n portfolio case study built around a clear operational problem and a human-controlled solution.",
    images: ["/og-v2.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
