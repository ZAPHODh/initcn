import { siteConfig } from "@/config/site";

type JsonLdData = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Safe - serializing our own static data for structured data
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: "Open source setup for Next.js.",
  author: {
    "@type": "Person",
    name: "ZAPHODh",
    url: "https://x.com/zaphodL",
  },
};

export const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description: "Open source infrastructure & config registry for Next.js.",
  url: siteConfig.url,
  author: {
    "@type": "Person",
    name: "ZAPHODh",
  },
};
