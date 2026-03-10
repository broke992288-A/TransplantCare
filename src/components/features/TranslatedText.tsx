import { useTranslatedText } from "@/hooks/useTranslate";
import { decodeSourceLang } from "@/utils/langPrefix";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2 } from "lucide-react";

interface Props {
  text: string | null | undefined;
  className?: string;
}

/** Renders text with auto-translation if [lang] prefix is detected and differs from UI lang */
export default function TranslatedText({ text, className }: Props) {
  const { lang: uiLang, t } = useLanguage();
  const { lang: sourceLang, text: cleanText } = decodeSourceLang(text);

  // Only translate if source language differs from UI language
  const needsTranslation = sourceLang && sourceLang !== uiLang;
  const { translated, loading } = useTranslatedText(
    needsTranslation ? cleanText : undefined,
    needsTranslation ? sourceLang : undefined
  );

  const display = needsTranslation ? (loading ? cleanText : translated) : cleanText;

  if (!display) return null;

  return (
    <span className={className}>
      {display}
      {loading && <Loader2 className="inline-block ml-1 h-3 w-3 animate-spin text-muted-foreground" />}
    </span>
  );
}
