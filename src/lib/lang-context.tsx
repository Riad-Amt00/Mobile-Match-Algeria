'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, TKey, Lang } from './i18n'

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey) => string
  tInterp: (key: string, params?: Record<string, string | number>) => string
}

const LangContext = createContext<LangCtx>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
  tInterp: (key) => key,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved === 'en' || saved === 'fr' || saved === 'ar') {
      setLangState(saved)
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr'
    }
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('lang', l)
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
  }

  function t(key: TKey): string {
    return (translations[lang] as any)[key] ?? (translations.en as any)[key] ?? key
  }

  function tInterp(key: string, params: Record<string, string | number> = {}): string {
    let str: string = (translations[lang] as any)[key] ?? (translations.en as any)[key] ?? key
    for (const [k, v] of Object.entries(params)) str = str.replace(`{${k}}`, String(v))
    return str
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t, tInterp }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
