import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { ValidatedInput } from "@/components/ui/form-field";

export type LabFieldStatus = "normal" | "warning" | "none";

export interface LabFieldProps {
  fieldKey: string;
  label: React.ReactNode;
  value: string;
  unit: string;
  /** Reference range text, e.g. "0.6–1.2 mg/dL". Null hides the hint line. */
  range: string | null;
  status: LabFieldStatus;
  error?: string;
  required?: boolean;
  step?: string;
  placeholder?: string;
  onValueChange: (fieldKey: string, value: string) => void;
}

/**
 * Stable, top-level lab input field.
 *
 * IMPORTANT: this component MUST live outside any dialog render scope. When it
 * was declared inside `AddLabDialog`, React saw a brand-new component type on
 * every keystroke, unmounted the old `<input>` and mounted a new one — which
 * destroyed the caret position and made values like `1.4` impossible to type.
 */
const LabField = memo(function LabField({
  fieldKey,
  label,
  value,
  unit,
  range,
  status,
  error,
  required = true,
  step,
  placeholder,
  onValueChange,
}: LabFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <ValidatedInput
          label={
            <span className="flex items-center gap-1.5">
              {label}
              {unit && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                  {unit}
                </Badge>
              )}
            </span>
          }
          required={required}
          error={error}
          type="number"
          inputMode="decimal"
          step={step ?? "0.1"}
          value={value}
          onChange={(e) => onValueChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          className={status === "warning" ? "border-warning focus-visible:ring-warning" : ""}
        />
      </div>
      {range && (
        <p
          className={`text-[11px] ${
            status === "warning" ? "text-warning font-medium" : "text-muted-foreground"
          }`}
        >
          {status === "warning" ? "⚠️ " : ""}Norma: {range}
          {status === "warning" && value && (
            <span className="ml-1">
              <ArrowRight className="inline h-3 w-3" /> {value} {unit}
            </span>
          )}
        </p>
      )}
    </div>
  );
});

export default LabField;
