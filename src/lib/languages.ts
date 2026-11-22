// Display names for the backend's supported language codes (Intl.DisplayNames isn't reliable on Hermes).
const NAMES: Record<string, string> = {
  en: 'English', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano', ru: 'Русский', tr: 'Türkçe',
  ar: 'العربية', hi: 'हिन्दी', id: 'Bahasa Indonesia', ja: '日本語', ko: '한국어', zh: '中文', si: 'සිංහල', ta: 'தமிழ்',
};
export const languageName = (code?: string | null) => (code ? NAMES[code] || code.toUpperCase() : 'English');
