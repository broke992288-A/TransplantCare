import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

const cache = new Map<string, string>();

function cacheKey(text: string, target: string, source?: string) {
  return `${source || "auto"}:${target}:${text}`;
}

export function useTranslatedText(
  text: string | null | undefined,
  sourceLang?: string
): { translated: string; loading: boolean } {
  const { lang } = useLanguage();
  const [translated, setTranslated] = useState(text ?? "");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!text) {
      setTranslated("");
      return;
    }

    // If source matches target, no translation needed
    if (sourceLang && sourceLang === lang) {
      setTranslated(text);
      return;
    }

    // If no source specified and text looks like target language, skip
    if (!sourceLang) {
      setTranslated(text);
      return;
    }

    const key = cacheKey(text, lang, sourceLang);
    if (cache.has(key)) {
      setTranslated(cache.get(key)!);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    supabase.functions
      .invoke("translate-text", {
        body: { texts: [text], targetLang: lang, sourceLang },
      })
      .then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (!error && data?.translations?.[0]) {
          cache.set(key, data.translations[0]);
          setTranslated(data.translations[0]);
        } else {
          setTranslated(text);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setTranslated(text);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [text, lang, sourceLang]);

  return { translated, loading };
}

/** Batch translate multiple texts */
export function useTranslatedTexts(
  texts: (string | null | undefined)[],
  sourceLang?: string
): { translations: string[]; loading: boolean } {
  const { lang } = useLanguage();
  const [translations, setTranslations] = useState<string[]>(texts.map((t) => t ?? ""));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sourceLang || sourceLang === lang || texts.length === 0) {
      setTranslations(texts.map((t) => t ?? ""));
      return;
    }

    const needsTranslation: { index: number; text: string }[] = [];
    const result = texts.map((t, i) => {
      if (!t) return "";
      const key = cacheKey(t, lang, sourceLang);
      if (cache.has(key)) return cache.get(key)!;
      needsTranslation.push({ index: i, text: t });
      return t;
    });

    if (needsTranslation.length === 0) {
      setTranslations(result);
      return;
    }

    setLoading(true);
    supabase.functions
      .invoke("translate-text", {
        body: {
          texts: needsTranslation.map((n) => n.text),
          targetLang: lang,
          sourceLang,
        },
      })
      .then(({ data, error }) => {
        if (!error && data?.translations) {
          data.translations.forEach((tr: string, i: number) => {
            const orig = needsTranslation[i];
            cache.set(cacheKey(orig.text, lang, sourceLang), tr);
            result[orig.index] = tr;
          });
        }
        setTranslations([...result]);
      })
      .catch(() => setTranslations(result))
      .finally(() => setLoading(false));
  }, [JSON.stringify(texts), lang, sourceLang]);

  return { translations, loading };
}
