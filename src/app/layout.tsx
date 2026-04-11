import type { Metadata } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '@/components/session-provider'
import { Navbar } from '@/components/navbar'
import { ToastProvider } from '@/components/toast'

export const metadata: Metadata = {
  title: 'Mobile Match Algeria — Compare Mobile Plans',
  description: 'Compare and find the best mobile plan in Algeria from Mobilis, Djezzy, and Ooredoo. Prepaid, Postpaid, Data-only plans. Personalized AI recommendations.',
  keywords: 'Algeria mobile plan comparison, Mobilis, Djezzy, Ooredoo, prepaid, postpaid, internet Algeria',
  openGraph: {
    title: 'Mobile Match Algeria',
    description: "Algeria's best mobile plan comparator",
    siteName: 'Mobile Match Algeria',
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <ToastProvider>
            <Navbar />
            <main>{children}</main>
          </ToastProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
