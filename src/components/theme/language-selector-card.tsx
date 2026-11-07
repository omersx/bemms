'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { setUserLocale } from '@/i18n/locale'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { useRouter } from 'next/navigation'

export function LanguageSelectorCard() {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSelect = (newLocale: Locale) => {
    if (newLocale === locale) return
    startTransition(async () => {
      await setUserLocale(newLocale)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {locale === 'ar' ? 'اللغة والمنطقة' : 'Language & Region'}
      </h3>
      <div className="bg-card rounded-xl border p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-snug">
              {locale === 'ar' ? 'لغة الواجهة' : 'Interface Language'}
            </span>
            <span className="text-xs text-muted-foreground">
              {locale === 'ar' ? 'اختر اللغة المفضلة للنظام (العربية / English)' : 'Select your preferred application language (English / العربية)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3.5">
          {locales.map((loc) => {
            const isSelected = locale === loc
            return (
              <button
                key={loc}
                type="button"
                disabled={isPending}
                onClick={() => handleSelect(loc)}
                className={cn(
                  "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all min-h-[44px]",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-transparent"
                )}
              >
                <Globe className={cn("w-4 h-4", isSelected ? "text-primary-foreground" : "")} />
                <span>{localeNames[loc]}</span>
                {isSelected && <Check className="w-3.5 h-3.5 ms-1" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
