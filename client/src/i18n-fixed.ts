import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import translationEN from './locales/en/translation.json';
import translationTR from './locales/tr/translation.json';
import translationRU from './locales/ru/translation.json';
import translationUK from './locales/uk/translation.json';
import translationDE from './locales/de/translation.json';
import translationFR from './locales/fr/translation.json';
import translationAR from './locales/ar/translation.json';
import translationES from './locales/es/translation.json';

const resources = {
  en: { translation: translationEN },
  tr: { translation: translationTR },
  ru: { translation: translationRU },
  uk: { translation: translationUK },
  de: { translation: translationDE },
  fr: { translation: translationFR },
  ar: { translation: translationAR },
  es: { translation: translationES }
};

// Get preferred language from localStorage or default to Turkish
const getStoredLanguage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('preferred-language') || 'tr';
  }
  return 'tr';
};

// Initialize i18n with proper configuration
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    keySeparator: '.',
    nsSeparator: ':',
    returnEmptyString: false,
    returnNull: false,
    returnObjects: false,
  })
  .then(() => {
    console.log('i18next initialized successfully');
  })
  .catch((error) => {
    console.error('i18next initialization failed:', error);
  });

// Language change function
export const changeLanguage = (lng: string) => {
  console.log(`Switching to language: ${lng}`);
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred-language', lng);
  }
  return i18n.changeLanguage(lng).then(() => {
    console.log(`Language changed to: ${lng}`);
    // Trigger a custom event for components to react to language changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: lng }));
    }
  });
};

export const getCurrentLanguage = () => i18n.language || 'tr';

// Export language names for the language switcher
export const languageNames = {
  en: 'English',
  tr: 'Türkçe',
  ru: 'Русский',
  uk: 'Українська',
  de: 'Deutsch',
  fr: 'Français',
  ar: 'العربية',
  es: 'Español'
};

// Export language directions (LTR or RTL)
export const languageDirections = {
  en: 'ltr',
  tr: 'ltr',
  ru: 'ltr',
  uk: 'ltr',
  de: 'ltr',
  fr: 'ltr',
  ar: 'rtl', // Arabic is right-to-left
  es: 'ltr'
};

export default i18n;