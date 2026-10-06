import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import JsonLd from "@/components/seo/JsonLd";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#D91A2A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://portal.pierc.org"),
  title: {
    default: "PIERC Incubation Management System | Parul University",
    template: "%s | PIERC Portal",
  },
  description:
    "Official incubation portal for Parul Innovation & Entrepreneurship Research Centre (PIERC) at Parul University. Apply for startup funding, incubation, mentorship, SSIP 2.0 grants, and FabLab prototyping support.",
  applicationName: "PIERC IMS",
  keywords: [
    "PIERC",
    "PIERC Portal",
    "portal.pierc.org",
    "Parul University Incubation",
    "Parul University Startup Incubator",
    "Incubation Management System",
    "Startup Incubator Vadodara",
    "Startup Grants Gujarat",
    "SSIP 2.0",
    "Student Startup and Innovation Policy",
    "NIDHI PRAYAS",
    "Yukti Portal",
    "DPIIT Recognised Incubator",
    "Entrepreneurship Development Cell EDC",
    "Vadodara Startup Studio",
    "Seed Fund Parul University",
  ],
  authors: [{ name: "PIERC - Parul University", url: "https://portal.pierc.org" }],
  creator: "Parul Innovation & Entrepreneurship Research Centre",
  publisher: "Parul University",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://portal.pierc.org",
  },
  openGraph: {
    title: "PIERC Incubation Management System | Parul University",
    description:
      "Empowering the next generation of job creators through early-stage grant funding, incubation, mentorship, and acceleration at Parul University.",
    url: "https://portal.pierc.org",
    siteName: "PIERC Incubation Management System",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PIERC Portal | Incubation Management System",
    description:
      "Apply for startup incubation, mentorship, and grant funding at Parul University.",
    creator: "@ParulUniversity",
    site: "@ParulUniversity",
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
  icons: {
    icon: "https://firebasestorage.googleapis.com/v0/b/pierc-portal-9bd82.firebasestorage.app/o/logo.svg?alt=media&token=52188887-32e9-4dcf-bec6-dde7175eaa86",
    shortcut: "https://firebasestorage.googleapis.com/v0/b/pierc-portal-9bd82.firebasestorage.app/o/logo.svg?alt=media&token=52188887-32e9-4dcf-bec6-dde7175eaa86",
    apple: "https://firebasestorage.googleapis.com/v0/b/pierc-portal-9bd82.firebasestorage.app/o/logo.svg?alt=media&token=52188887-32e9-4dcf-bec6-dde7175eaa86",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-QF98WSXXCZ"
        />
        <Script
          id="google-analytics-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-QF98WSXXCZ', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
        <JsonLd />
      </head>
      <body className={`${inter.className} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
