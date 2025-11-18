declare module "virtual:i18next-loader" {
  type Translation = typeof import("../locales/en/translation.json");

  const resources: {
    en: { translation: Translation };
    base92: { translation: Translation };
    base100: { translation: Translation };
  };
  export default resources;
}

declare module "base92" {
  export function encode(input: string | Buffer): string;

  export function decode(input: string): Buffer;
}
