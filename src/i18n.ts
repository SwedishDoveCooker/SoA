
import resources from "virtual:i18next-loader";
import i18n from "i18next";
import ICU from "i18next-icu";
import { initReactI18next } from "react-i18next";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
  }
}

i18n
  .use(initReactI18next)
  .use(ICU)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
