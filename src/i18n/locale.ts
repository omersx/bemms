'use server';

import { cookies } from 'next/headers';
import { defaultLocale, type Locale } from './config';

const COOKIE_NAME = 'BEMMS_LOCALE';

export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_NAME)?.value;
  return (locale === 'ar' ? 'ar' : defaultLocale) as Locale;
}

export async function setUserLocale(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });
}
