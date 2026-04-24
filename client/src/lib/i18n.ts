import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import ar from "../locales/ar.json";
import fr from "../locales/fr.json";
import es from "../locales/es.json";
import de from "../locales/de.json";

export const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "ar", label: "العربية", flag: "🇸🇦", dir: "rtl" },
  { code: "fr", label: "Français", flag: "🇫🇷", dir: "ltr" },
  { code: "es", label: "Español", flag: "🇪🇸", dir: "ltr" },
  { code: "de", label: "Deutsch", flag: "🇩🇪", dir: "ltr" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      fr: { translation: fr },
      es: { translation: es },
      de: { translation: de },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ar", "fr", "es", "de"],
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
