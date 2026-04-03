import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function getStoredLang(): string {
  try { return localStorage.getItem("app-lang") || "en"; } catch { return "en"; }
}

const errorTexts: Record<string, Record<string, string>> = {
  en: { title: "An error occurred", desc: "An unexpected error occurred in this section.", retry: "Try Again" },
  ru: { title: "Произошла ошибка", desc: "В этом разделе произошла ошибка.", retry: "Попробовать снова" },
  uz: { title: "Xatolik yuz berdi", desc: "Bu bo'limda kutilmagan xatolik yuz berdi.", retry: "Qayta urinish" },
};

/** Lightweight error boundary for wrapping individual routes/sections */
export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RouteError]", error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      const lang = getStoredLang();
      const txt = errorTexts[lang] || errorTexts.en;
      return (
        <div className="flex items-center justify-center p-8">
          <Card className="max-w-sm w-full">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">{this.props.fallbackTitle ?? txt.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{txt.desc}</p>
              {this.state.error && (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-20 text-muted-foreground">
                  {this.state.error.message}
                </pre>
              )}
              <Button size="sm" onClick={this.handleReset}>
                <RefreshCw className="h-4 w-4 mr-1" />{txt.retry}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
