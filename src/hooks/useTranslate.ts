import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";

const cache = new Map<string, string>();

function cacheKey(text: string, target: string, source?: string) {
  return `${source || "auto"}:${target}:${text}`;
}

// ---------------- Batched queue ----------------
type PendingItem = {
  text: string;
  targetLang: string;
  sourceLang?: string;
  resolve: (translated: string) => void;
};

const queue: PendingItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushQueue, 60);
}

async function invokeWithRetry(body: Record<string, unknown>, attempts = 3) {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.functions.invoke("translate-text", { body });
    if (!error && data?.translations) return data.translations as string[];
    lastErr = error;
    // Backoff for boot/503 errors
    await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  throw lastErr ?? new Error("translate-text failed");
}

async function flushQueue() {
  flushTimer = null;
  const batch = queue.splice(0, queue.length);
  if (batch.length === 0) return;

  // Group by (targetLang, sourceLang)
  const groups = new Map<string, PendingItem[]>();
  for (const item of batch) {
    const k = `${item.sourceLang || "auto"}->${item.targetLang}`;
    const arr = groups.get(k) ?? [];
    arr.push(item);
    groups.set(k, arr);
  }

  for (const items of groups.values()) {
    // Deduplicate texts within group
    const uniqueTexts: string[] = [];
    const indexMap = new Map<string, number>();
    for (const it of items) {
      if (!indexMap.has(it.text)) {
        indexMap.set(it.text, uniqueTexts.length);
        uniqueTexts.push(it.text);
      }
    }
    try {
      const translations = await invokeWithRetry({
        texts: uniqueTexts,
        targetLang: items[0].targetLang,
        sourceLang: items[0].sourceLang,
      });
      for (const it of items) {
        const idx = indexMap.get(it.text)!;
        const tr = translations[idx] ?? it.text;
        cache.set(cacheKey(it.text, it.targetLang, it.sourceLang), tr);
        it.resolve(tr);
      }
    } catch {
      for (const it of items) it.resolve(it.text);
    }
  }
}

function enqueueTranslation(text: string, targetLang: string, sourceLang?: string): Promise<string> {
  return new Promise((resolve) => {
    queue.push({ text, targetLang, sourceLang, resolve });
    scheduleFlush();
  });
}

// ---------------- Hooks ----------------
export function useTranslatedText(
  text: string | null | undefined,
  sourceLang?: string
): { translated: string; loading: boolean } {
  const { lang } = useLanguage();
  const [translated, setTranslated] = useState(text ?? "");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef({ cancelled: false });

  useEffect(() => {
    abortRef.current.cancelled = false;
    const localRef = abortRef.current;

    if (!text) {
      setTranslated("");
      return;
    }
    if (!sourceLang || sourceLang === lang) {
      setTranslated(text);
      return;
    }

    const key = cacheKey(text, lang, sourceLang);
    if (cache.has(key)) {
      setTranslated(cache.get(key)!);
      return;
    }

    setLoading(true);
    enqueueTranslation(text, lang, sourceLang).then((tr) => {
      if (localRef.cancelled) return;
      setTranslated(tr);
      setLoading(false);
    });

    return () => {
      localRef.cancelled = true;
    };
  }, [text, lang, sourceLang]);

  return { translated, loading };
}

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

    let cancelled = false;
    const result = texts.map((t) => t ?? "");
    const pending: Promise<void>[] = [];

    texts.forEach((t, i) => {
      if (!t) return;
      const key = cacheKey(t, lang, sourceLang);
      if (cache.has(key)) {
        result[i] = cache.get(key)!;
        return;
      }
      pending.push(
        enqueueTranslation(t, lang, sourceLang).then((tr) => {
          result[i] = tr;
        }),
      );
    });

    if (pending.length === 0) {
      setTranslations(result);
      return;
    }

    setLoading(true);
    Promise.all(pending).then(() => {
      if (cancelled) return;
      setTranslations([...result]);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(texts), lang, sourceLang]);

  return { translations, loading };
}
