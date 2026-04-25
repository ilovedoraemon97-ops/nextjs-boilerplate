import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthGate from "@/components/AuthGate";
import GlobalOnboarding from "@/components/GlobalOnboarding";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DoneDay",
  description: "목표를 실제 행동으로 실행하게 만드는 소셜 생산성 앱",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen bg-bg-base text-text-base flex justify-center tracking-tight transition-colors duration-300`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div id="app-shell" className="w-full sm:max-w-md bg-bg-surface min-h-screen relative shadow-2xl overflow-hidden flex flex-col pb-20 transition-colors duration-300">
            <main className="flex-1 w-full h-full overflow-y-auto">
              {children}
            </main>
            <BottomNav />
          </div>
          <GlobalOnboarding />
          <AuthGate />
        </ThemeProvider>
      </body>
    </html>
  );
}
