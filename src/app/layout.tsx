import type { Metadata } from "next";
import { Rajdhani } from "next/font/google";
import "./globals.css";
import ThirdwebAppProvider from "../../components/ThirdwebAppProvider";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: "NFTPD: Blockchain Security and Education",
  description: "Leading blockchain security and education organization, working alongside Osiris Protocol to mediate token blacklist investigations.",
  openGraph: {
    title: "NFTPD: Blockchain Security and Education",
    description:
      "NFTPD is a forward-looking blockchain security and education organization, collaborating with the top development firm, Osiris Protocol, to mediate and investigate their token blacklist. We aim to build a secure and transparent blockchain ecosystem by educating and protecting communities through expert guidance and cutting-edge security measures.",
    type: "website",
    url: "https://projectnftpd.io", // Official URL for NFTPD
    images: [
      {
        url: "https://storage.googleapis.com/tgl_cdn/MegaServerParty/NFTPD.png", // NFTPD banner image
        width: 1200,
        height: 630,
        alt: "NFTPD Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NFTPD: Blockchain Security and Education",
    description:
      "Join NFTPD, a pioneering organization in blockchain security and education, as we work with Osiris Protocol to ensure transparency and protection through expert-led investigations into token blacklists.",
    images: [
      {
        url: "https://storage.googleapis.com/tgl_cdn/MegaServerParty/NFTPD.png", // NFTPD banner image
        alt: "NFTPD Banner",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* General Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

        {/* Open Graph Meta Tags for Facebook, Discord, LinkedIn, etc. */}
        <meta property="og:title" content="NFTPD: Blockchain Security and Education" />
        <meta property="og:description" content="NFTPD is dedicated to blockchain security and education, mediating token blacklist investigations with Osiris Protocol." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://projectnftpd.io" />
        <meta property="og:image" content="https://storage.googleapis.com/tgl_cdn/MegaServerParty/NFTPD.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="NFTPD Banner" />
        <meta property="og:site_name" content="NFTPD" />

        {/* Twitter Card Meta Tags for X.com */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NFTPD: Blockchain Security and Education" />
        <meta name="twitter:description" content="NFTPD partners with Osiris Protocol to provide top-tier blockchain security and mediation for token blacklist investigations." />
        <meta name="twitter:image" content="https://storage.googleapis.com/tgl_cdn/MegaServerParty/NFTPD.png" />
        <meta name="twitter:image:alt" content="NFTPD Banner" />

        {/* Additional Metadata for SEO and Rich Links */}
        <meta property="og:locale" content="en_US" />
        <meta property="og:updated_time" content="2024-01-01T00:00:00Z" />
        <meta property="article:author" content="NFTPD" />

        {/* Facebook Specific Meta */}
        <meta property="fb:app_id" content="YOUR_FACEBOOK_APP_ID" />

        {/* General Meta Tags */}
        <link rel="canonical" href="https://projectnftpd.io" />
      </head>
      <body className={rajdhani.className} suppressHydrationWarning>
        <ThirdwebAppProvider>
          {children}
        </ThirdwebAppProvider>
      </body>
    </html>
  );
}
