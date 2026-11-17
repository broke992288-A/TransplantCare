import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useTx } from "@/i18n/uiText";
import { localizeClinicalText } from "@/i18n/clinicalText";
import { useLanguage } from "@/hooks/useLanguage";

export function Toaster() {
  const { toasts } = useToast();
  const tx = useTx();
  const { lang } = useLanguage();
  const localize = (text: React.ReactNode) => typeof text === "string" ? tx(localizeClinicalText(text, lang)) : text;

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{localize(title)}</ToastTitle>}
              {description && <ToastDescription>{localize(description)}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
