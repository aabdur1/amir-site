import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, Share_Tech_Mono } from "next/font/google";
import DarkModeToggle from "@/components/dark-mode-toggle";
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

export const metadata: Metadata = {
  title: "Amir Abdur-Rahim",
  description: "Personal site of Amir Abdur-Rahim.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmSans.variable} ${shareTechMono.variable} antialiased`}
    >
      <body>
        <DarkModeToggle />
        {children}
      </body>
    </html>
  );
}
