import type { Metadata } from "next";
import { Nunito, Poppins, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { RealTimeNotificationBanner } from "@/components/real-time-notification-banner";
import { RedisInitializer } from "@/components/redis-initializer";
import { ThemeInitializer } from "@/components/theme-initializer";
import { TrialChecker } from "@/components/trial-checker";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POS Starter Kit",
  description:
    "Fullstack Point of Sale System with inventory, reporting, and multi-branch support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${poppins.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeInitializer />
          <RedisInitializer />
          <RealTimeNotificationBanner />
          <TrialChecker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
