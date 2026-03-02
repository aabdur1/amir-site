import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, Share_Tech_Mono, Lora } from "next/font/google";
import Nav from "@/components/nav";
import { Footer } from "@/components/footer";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

const shareTechMono = Share_Tech_Mono({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const lora = Lora({
  weight: ["400", "500"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-badge",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://amirabdurrahim.com'),
  title: {
    default: 'Amir Abdur-Rahim',
    template: '%s | Amir Abdur-Rahim',
  },
  description: 'Personal site of Amir Abdur-Rahim.',
  openGraph: {
    siteName: 'Amir Abdur-Rahim',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmSans.variable} ${shareTechMono.variable} ${lora.variable} antialiased`}
    >
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
