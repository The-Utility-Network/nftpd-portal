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
    url: "https://portal.nftpd.org", // Official URL for NFTPD Portal
  },
  twitter: {
    card: "summary_large_image",
    title: "NFTPD: Blockchain Security and Education",
    description:
      "Join NFTPD, a pioneering organization in blockchain security and education, as we work with Osiris Protocol to ensure transparency and protection through expert-led investigations into token blacklists.",
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
        <link rel="canonical" href="https://portal.nftpd.org" />
      </head>
      <body className={rajdhani.className} suppressHydrationWarning>
        <ThirdwebAppProvider>
          {children}
        </ThirdwebAppProvider>
      </body>
    </html>
  );
}
