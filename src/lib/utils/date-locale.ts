import { ar, enUS } from 'date-fns/locale';

export function getDateLocale(locale: string) {
  return locale === 'ar' ? ar : enUS;
}
