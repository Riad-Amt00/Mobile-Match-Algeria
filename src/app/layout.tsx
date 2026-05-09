import type { Metadata } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '@/components/session-provider'
import { Navbar } from '@/components/navbar'
import { ToastProvider } from '@/components/toast'
import { LangProvider } from '@/lib/lang-context'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent light/dark mode flash by applying saved theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)})()` }} />
      </head>
      <body>
        <LangProvider>
          <SessionProviderWrapper>
            <ToastProvider>
              <Navbar />
              <main>{children}</main>
            </ToastProvider>
          </SessionProviderWrapper>
        </LangProvider>
      </body>
    </html>
  )
}
