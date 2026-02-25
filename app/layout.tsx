import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Mono, Poppins, Montserrat } from "next/font/google";
import QueryProvider from "@/providers/QueryProvider";
import SpendConfirmProvider from "@/providers/SpendConfirmProvider";
import AuthInit from "@/components/layout/AuthInit";
import ToastHost from "@/components/ui/Toast";
import InstallPrompt from "@/components/pwa/InstallPrompt";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lovask",
    template: "%s · Lovask",
  },
  description: "Premium arkadaslik uygulamasi",
  applicationName: "Lovask",
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Lovask",
    title: "Lovask",
    description: "Premium arkadaslik uygulamasi",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Lovask",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lovask",
    description: "Premium arkadaslik uygulamasi",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/lovask_app_icon.png", type: "image/png", sizes: "192x192" },
      { url: "/lovask_app_icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/lovask_app_icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Lovask",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ec4899",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme) {
                    document.documentElement.setAttribute('data-theme', theme);
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} ${poppins.variable} ${montserrat.variable} antialiased`}
      >
        <QueryProvider>
          <SpendConfirmProvider>
            <AuthInit>{children}</AuthInit>
            <ToastHost />
            <InstallPrompt />
          </SpendConfirmProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
