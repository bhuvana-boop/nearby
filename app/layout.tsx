import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Nearby · Care for parents who live far away", template: "%s · Nearby" },
  description:
    "Send your Claude a photo of the prescription. Nearby turns it into a live care board the helper at home ticks off, every sibling can see, and your calendar follows.",
  applicationName: "Nearby",
  appleWebApp: { capable: true, title: "Nearby", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b2a31",
};

// Applies the saved theme before first paint so there is no light/dark flash.
const THEME_SCRIPT = `try{var t=localStorage.getItem('nearby-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
