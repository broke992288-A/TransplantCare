import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Languages } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const SOURCE_LANGS = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "uz", label: "O'zbek" },
];

export default function SourceLanguageSelect({ value, onChange }: Props) {
  const { t } = useLanguage();

  return (
    <div>
      <Label className="flex items-center gap-1.5 mb-1.5">
        <Languages className="h-3.5 w-3.5" />
        {t("translate.writtenIn")}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_LANGS.map((l) => (
            <SelectItem key={l.value} value={l.value}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
