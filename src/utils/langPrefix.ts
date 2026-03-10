/** Encode source language into text: "[en]Some note" */
export function encodeSourceLang(text: string, lang: string): string {
  if (!text.trim()) return text;
  return `[${lang}]${text}`;
}

/** Decode source language from text: returns { lang, text } */
export function decodeSourceLang(raw: string | null | undefined): { lang: string | undefined; text: string } {
  if (!raw) return { lang: undefined, text: "" };
  const match = raw.match(/^\[(en|ru|uz)\](.*)$/s);
  if (match) return { lang: match[1], text: match[2] };
  return { lang: undefined, text: raw };
}
