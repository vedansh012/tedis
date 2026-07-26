import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCProvider } from "@/lib/trpc/provider";
import { clientEnv } from "@/config/env";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = process.env.APP_URL ?? "http://localhost:3000";
const SITE_DESCRIPTION =
  "TedIS is an interest-based home for builders, learners, and creators. Show your work, learn in the open, and find the people worth building with.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${clientEnv.APP_NAME} — Build in the open`,
    template: `%s · ${clientEnv.APP_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: clientEnv.APP_NAME,
  keywords: ["build in public", "developers", "projects", "portfolio", "open source", "learning", "community"],
  openGraph: {
    type: "website",
    siteName: clientEnv.APP_NAME,
    title: `${clientEnv.APP_NAME} — Build in the open`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${clientEnv.APP_NAME} — Build in the open`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
