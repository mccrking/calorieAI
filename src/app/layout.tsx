import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PWAInstallPrompt } from "@/hooks/use-pwa";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CalorieAI - Smart Food Calorie Tracker",
  description:
    "Track your food calories instantly with AI. Simply snap a photo or describe your meal to get accurate nutritional analysis. Perfect for beginners and fitness pros.",
  keywords: [
    "calorie tracker",
    "nutrition",
    "AI food analysis",
    "diet",
    "macros",
    "health",
  ],
  icons: {
    icon: "/icon-1024.png",
    apple: "/icon-1024.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CalorieAI",
    startupImage: "/icon-1024.png",
  },
  openGraph: {
    title: "CalorieAI - Smart Food Calorie Tracker",
    description: "AI-powered calorie tracking by image or text",
    type: "website",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-1024.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="default"
        />
        <meta name="apple-mobile-web-app-title" content="CalorieAI" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}