/** Encode source language into text: "[en]Some note" */
export function encodeSourceLang(text: string, lang: string): string {
  if (!text.trim()) return text;
  return `[${lang}]${text}`;
}

/** Heuristic language detection: 'uz' | 'ru' | 'en' */
export function detectLang(raw: string): "uz" | "ru" | "en" | undefined {
  if (!raw || !raw.trim()) return undefined;
  const text = raw.toLowerCase();
  // Uzbek-specific Cyrillic letters
  if (/[ўғқҳ]/.test(text)) return "uz";
  // General Cyrillic → Russian
  if (/[\u0400-\u04ff]/.test(text)) return "ru";
  // Uzbek Latin markers: special letters oʻ/gʻ (with modifier ʻ) or common words
  if (/oʻ|gʻ|ʻ|\b(bemor|shifokor|kasal|salom|rahmat|qabul|tahlil|davolash|kerak|yaxshi|holatda|natijasi)\b/.test(text)) return "uz";
  // Latin → English
  if (/[a-z]/.test(text)) return "en";
  return undefined;
}

/** Decode source language from text: returns { lang, text }. Auto-detects when no prefix. */
export function decodeSourceLang(raw: string | null | undefined): { lang: string | undefined; text: string } {
  if (!raw) return { lang: undefined, text: "" };
  const match = raw.match(/^\[(en|ru|uz)\](.*)$/s);
  if (match) return { lang: match[1], text: match[2] };
  return { lang: detectLang(raw), text: raw };
}
