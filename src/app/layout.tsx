import type { Metadata } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '@/components/session-provider'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Mobile Match Algeria — Comparateur d\'offres mobiles',
  description: 'Comparez et trouvez la meilleure offre mobile en Algérie parmi Mobilis, Djezzy et Ooredoo. Forfaits Prépayés, Postpayés, Internet. Recommandations personnalisées.',
  keywords: 'comparateur offres mobiles algérie, Mobilis, Djezzy, Ooredoo, forfaits prépayés, forfaits postpayés, internet algérie',
  openGraph: {
    title: 'Mobile Match Algeria',
    description: 'Le meilleur comparateur d\'offres mobiles en Algérie',
    siteName: 'Mobile Match Algeria',
    locale: 'fr_DZ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SessionProviderWrapper>
          <Navbar />
          <main>{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
