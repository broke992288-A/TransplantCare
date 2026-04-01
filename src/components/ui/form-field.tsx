import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: React.ReactNode;
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className={cn(error && "text-destructive")}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  );
}

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  error?: string;
  required?: boolean;
  wrapperClassName?: string;
}

export function ValidatedInput({ label, error, required, wrapperClassName, className, ...props }: ValidatedInputProps) {
  return (
    <FormField label={label} error={error} required={required} className={wrapperClassName}>
      <Input className={cn(error && "border-destructive focus-visible:ring-destructive", className)} {...props} />
    </FormField>
  );
}
