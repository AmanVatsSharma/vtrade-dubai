/**
 * File: app/layout.tsx
 * Module: app
 * Purpose: Root layout and global providers for the VTrade web app.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Updated metadata branding from MarketPulse360 to VTrade.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import SessionProvider from "@/components/providers/SessionProvider";
import ApolloProviderWrapper from "@/components/apollo-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { GlobalErrorHandler } from "@/components/trading/GlobalErrorHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VTrade",
  description: "Trade Live. Trade Sharp.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // const session = await auth()
  // console.log(session)
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalErrorHandler>
          <SessionProvider>
            <ApolloProviderWrapper>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <Toaster />
              </ThemeProvider>
            </ApolloProviderWrapper>
          </SessionProvider>
        </GlobalErrorHandler>
      </body>
    </html>
  );
}
