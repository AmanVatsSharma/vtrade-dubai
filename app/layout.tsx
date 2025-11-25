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
  title: "MarketPulse360",
  description: "Just Rock And Trade Buddy!",
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
