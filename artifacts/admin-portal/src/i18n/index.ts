import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ar from './ar.json';

const savedLang = localStorage.getItem('admin_lang') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Sync HTML dir + lang attribute on init
document.documentElement.lang = savedLang;
document.documentElement.dir  = savedLang === 'ar' ? 'rtl' : 'ltr';

export default i18n;
