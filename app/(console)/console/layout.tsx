import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Trading Console - Premium Dashboard",
  description: "Professional trading console dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans`}>
        <Suspense fallback={null}>
            {children}
        </Suspense>
      </body>
    </html>
  )
}
