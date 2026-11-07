'use client'

import * as React from 'react'
import { useTheme } from '@/components/providers/theme-provider'
import { Moon, Sun, Monitor, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslations } from 'next-intl'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const t = useTranslations('common')

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('theme.toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer justify-between">
          <div className="flex items-center">
            <Sun className="me-2 h-4 w-4" />
            <span>{t('theme.light')}</span>
          </div>
          {theme === 'light' && <Check className="h-4 w-4 text-primary ms-2" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer justify-between">
          <div className="flex items-center">
            <Moon className="me-2 h-4 w-4" />
            <span>{t('theme.dark')}</span>
          </div>
          {theme === 'dark' && <Check className="h-4 w-4 text-primary ms-2" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="cursor-pointer justify-between">
          <div className="flex items-center">
            <Monitor className="me-2 h-4 w-4" />
            <span>{t('theme.system')}</span>
          </div>
          {theme === 'system' && <Check className="h-4 w-4 text-primary ms-2" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
