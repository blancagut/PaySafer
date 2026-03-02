import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'PaySafer.me - Safe Payments for Global Transactions',
  description: 'The trusted escrow platform for secure transactions between buyers and sellers worldwide. Pay safer, transact with confidence.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.paysafer.site'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PaySafer',
  },
  icons: {
    icon: '/paysaferfavicon.png',
    shortcut: '/paysaferfavicon.png',
    apple: '/paysaferfavicon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors theme="dark" />
        </ThemeProvider>
      </body>
    </html>
  )
}
