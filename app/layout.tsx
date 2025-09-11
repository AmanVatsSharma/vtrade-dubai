import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import SessionProvider from "@/components/providers/SessionProvider";
import ApolloProviderWrapper from "@/components/apollo-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

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
        <SessionProvider>
          <ApolloProviderWrapper>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >

              {children}
            </ThemeProvider>
          </ApolloProviderWrapper>
        </SessionProvider>
      </body>
    </html>
  );
}
