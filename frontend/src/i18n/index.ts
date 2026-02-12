import { es } from './es';
import { en } from './en';

export type Language = 'es' | 'en';
export type Translations = typeof es;

export const translations: Record<Language, Translations> = {
  es,
  en,
};

export { es, en };
