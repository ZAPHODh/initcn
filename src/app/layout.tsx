import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { siteConfig } from "@/config/site";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "initcn - Infrastructure & Config Registry",
    template: "%s | initcn",
  },
  description:
    "Ready-to-use infrastructure configurations for Next.js applications. Authentication, internationalization, payments, and more. Built on the shadcn registry architecture.",
  keywords: [
    "infrastructure",
    "configuration",
    "React",
    "Next.js",
    "authentication",
    "i18n",
    "internationalization",
    "payments",
    "shadcn",
    "registry",
    "setup templates",
    "config templates",
    "React components",
    "TypeScript",
    "Tailwind CSS",
  ],
  authors: [{ name: "ZAPHODh", url: "https://github.com/ZAPHODh" }],
  creator: "ZAPHODh",
  publisher: "initcn",
  category: "Technology",
  alternates: {
    canonical: siteConfig.url,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "initcn - Infrastructure & Config Registry",
    description:
      "Ready-to-use infrastructure configurations for Next.js applications. Authentication, internationalization, payments, and more.",
    url: siteConfig.url,
    siteName: "initcn",
    images: [
      {
        url: "/initcn-banner.png",
        width: 1200,
        height: 630,
        alt: "initcn - Infrastructure & Config Registry for Next.js",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "initcn - Infrastructure & Config Registry",
    description:
      "Ready-to-use infrastructure configurations for Next.js applications. Authentication, internationalization, payments, and more.",
    images: ["/initcn-banner.png"],
    creator: "@ZAPHODh",
    site: "@ZAPHODh",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geist.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
