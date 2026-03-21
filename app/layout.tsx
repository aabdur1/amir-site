import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, Share_Tech_Mono, Lora } from "next/font/google";
import Nav from "@/components/nav";
import { Footer } from "@/components/footer";
import { ScrollProgress } from "@/components/scroll-progress";
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
  weight: "400",
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
  description: 'Amir Abdur-Rahim — software engineer, healthcare technologist, and photographer. MS in MIS at UIC. Chicago.',
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
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#eff1f5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1e1e2e" media="(prefers-color-scheme: dark)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: 'Amir Abdur-Rahim',
              url: 'https://amirabdurrahim.com',
              sameAs: [
                'https://github.com/aabdur1',
                'https://www.linkedin.com/in/amir-abdur-rahim/',
                'https://www.credly.com/users/amir-abdur-rahim',
              ],
              jobTitle: 'Software Engineer',
              alumniOf: {
                '@type': 'CollegeOrUniversity',
                name: 'University of Illinois Chicago',
              },
              address: {
                '@type': 'PostalAddress',
                addressLocality: 'Chicago',
                addressRegion: 'IL',
              },
            }),
          }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[10000] focus:top-4 focus:left-4
            focus:px-4 focus:py-2 focus:bg-cream focus:dark:bg-night focus:text-ink focus:dark:text-night-text
            focus:rounded-lg focus:shadow-card focus:outline-2 focus:outline-mauve focus:dark:outline-mauve-dark"
        >
          Skip to main content
        </a>
        <ScrollProgress />
        <Nav />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
