import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", weight: ["500", "600", "700"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Nearby - care for parents who live far away",
  description:
    "Send Claude a photo of the prescription. Nearby turns it into a live care board your parents' helper can tick off, your siblings can see, and your calendar follows.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f5f4a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
