import type { Metadata } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '@/components/session-provider'
import { Navbar } from '@/components/navbar'

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
          <Navbar />
          <main>{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
