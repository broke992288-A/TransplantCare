import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Helper to get translation from localStorage (class components can't use hooks)
function getStoredLang(): string {
  try { return localStorage.getItem("app-lang") || "en"; } catch { return "en"; }
}

const errorTexts: Record<string, Record<string, string>> = {
  en: { title: "An error occurred", desc: "An unexpected error occurred. Please try again.", retry: "Try Again", reload: "Reload Page" },
  ru: { title: "Произошла ошибка", desc: "Произошла непредвиденная ошибка. Попробуйте снова.", retry: "Попробовать снова", reload: "Перезагрузить" },
  uz: { title: "Xatolik yuz berdi", desc: "Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring.", retry: "Qayta urinish", reload: "Sahifani yangilash" },
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Unhandled error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const lang = getStoredLang();
      const txt = errorTexts[lang] || errorTexts.en;
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="flex flex-row items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <CardTitle className="text-lg">{txt.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{txt.desc}</p>
              {this.state.error && (
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-32 text-muted-foreground">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset}>{txt.retry}</Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  {txt.reload}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
