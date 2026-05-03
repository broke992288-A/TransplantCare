import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export default function AIChat() {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const placeholder =
    lang === "ru" ? "Задайте вопрос…" : lang === "uz" ? "Savol bering…" : "Ask anything…";
  const title = lang === "ru" ? "AI Ассистент" : lang === "uz" ? "AI Yordamchi" : "AI Assistant";
  const subtitle =
    lang === "ru"
      ? "Задавайте вопросы и получайте ответы в реальном времени"
      : lang === "uz"
        ? "Savollar bering va real vaqtda javob oling"
        : "Ask questions and get streamed answers";
  const sendLabel = lang === "ru" ? "Отправить" : lang === "uz" ? "Yuborish" : "Send";
  const clearLabel = lang === "ru" ? "Очистить" : lang === "uz" ? "Tozalash" : "Clear";
  const emptyHint =
    lang === "ru"
      ? "Начните разговор с AI ассистентом"
      : lang === "uz"
        ? "AI yordamchi bilan suhbatni boshlang"
        : "Start a conversation with the AI assistant";

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast({ title: "Auth error", description: "Please sign in again", variant: "destructive" });
        setIsStreaming(false);
        return;
      }
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
        },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        let errMsg = `HTTP ${resp.status}`;
        try {
          const data = await resp.json();
          if (data?.error) errMsg = data.error;
        } catch {
          /* ignore */
        }
        if (resp.status === 429) {
          toast({ title: "Rate limit", description: errMsg, variant: "destructive" });
        } else if (resp.status === 402) {
          toast({ title: "AI credits exhausted", description: errMsg, variant: "destructive" });
        } else {
          toast({ title: "Chat error", description: errMsg, variant: "destructive" });
        }
        setIsStreaming(false);
        return;
      }

      let assistantText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((prev) => {
                const copy = prev.slice();
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {
            // partial JSON; put back and wait for more
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast({
          title: "Network error",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-3xl flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Sparkles className="h-6 w-6 text-primary" />
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearChat}>
              <Trash2 className="h-4 w-4" />
              {clearLabel}
            </Button>
          )}
        </div>

        <Card className="flex flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <div className="space-y-2">
                  <Sparkles className="mx-auto h-10 w-10 opacity-40" />
                  <p className="text-sm">{emptyHint}</p>
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2 prose-headings:mt-3 prose-headings:mb-2">
                        {m.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                rows={1}
                className="max-h-40 min-h-[44px] resize-none"
                disabled={isStreaming}
              />
              <Button onClick={send} disabled={isStreaming || !input.trim()} size="icon">
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="sr-only">{sendLabel}</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
