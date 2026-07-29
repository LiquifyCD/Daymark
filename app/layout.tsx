import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PwaBoot } from "./pwa-boot";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  metadataBase: new URL("https://liquifycd.github.io/Daymark/"),
  title: "Daymark — Daily check-ins",
  description: "Make a daily promise and mark it done.",
  applicationName: "Daymark",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Daymark" },
  icons: {
    icon: [
      { url: `${basePath}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${basePath}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${basePath}/icons/apple-touch-icon.png`, sizes: "180x180" }],
    shortcut: `${basePath}/favicon.ico`,
  },
  openGraph: {
    title: "Daymark — Keep your word to yourself",
    description: "A calm daily check-in for the promises that matter.",
    type: "website",
    url: "https://liquifycd.github.io/Daymark/",
    images: [{ url: "https://liquifycd.github.io/Daymark/og.png", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  themeColor: "#10081f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={geist.variable}>
        {children}
        <PwaBoot />
      </body>
    </html>
  );
}
