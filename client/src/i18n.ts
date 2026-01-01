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
const getPreferredLanguage = () => {
  return localStorage.getItem('preferred-language') || 'tr';
};

// Initialize i18n with proper language detection
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getPreferredLanguage(),
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
  });

// Language change function
export const changeLanguage = (lng: string) => {

  localStorage.setItem('preferred-language', lng);
  i18n.changeLanguage(lng).then(() => {
    window.location.reload();
  });
};

// Alias for backward compatibility
export const setLanguageWithPersistence = changeLanguage;

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

// Clear local storage translation cache and reload translations
export const clearTranslationCache = () => {
  
  
  // Clear all i18next related localStorage entries
  if (typeof window !== 'undefined') {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('i18next')) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('i18nextLng');
  }
  
  // Clear the resource store completely
  if (i18n.isInitialized) {
    i18n.store.data = {};
    
    // Force reload resources
    return i18n.reloadResources().then(() => {
      
      // Force a complete page reload to ensure fresh translations
      window.location.reload();
    }).catch(error => {
      console.error("Error reloading translations:", error);
      window.location.reload();
    });
  }
};

// Create a custom event to notify components about language changes
export const triggerManualLanguageRefresh = () => {
  
  document.dispatchEvent(new CustomEvent('moogship:languageChanged', { detail: i18n.language }));
};

// Add language change listener to trigger manual refresh
i18n.on('languageChanged', (lng) => {
  
  setTimeout(() => {
    triggerManualLanguageRefresh();
  }, 10);
});

export default i18n;