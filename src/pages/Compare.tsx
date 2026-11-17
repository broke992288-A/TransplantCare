import { useLanguage } from "@/hooks/useLanguage";
import { useTx } from "@/i18n/uiText";
import { translateDocument } from "@/i18n/documentText";
import LanguageSelector from "@/components/features/LanguageSelector";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { lang } = useLanguage();
  const tx = useTx();
  const td = (text: string) => translateDocument(text, lang);
  const tableData = [
    {
      category: "УМУМИЙ МАЪЛУМОТ",
      rows: [
        ["Лойиҳа номи", "Health Companion Registry", "Dream Weaver", "Transplant Guardian"],
        ["Технология", "Vite + React + Shadcn + TS", "Vite + React + Shadcn + TS", "Vite + React + Shadcn + TS + Testing"],
        ["Мақсад", "MVP дашборд (статик)", "Тўлиқ трансплантация реестри", "Аутентификация + бемор портали"],
      ],
    },
    {
      category: "САҲИФАЛАР",
      rows: [
        ["Dashboard", "✅ Index.tsx", "✅ Dashboard.tsx + Index.tsx", "✅ Dashboard.tsx + Index.tsx"],
        ["Беморлар рўйхати", "✅ Patients.tsx", "✅ Patients.tsx", "❌ Йўқ (Dashboard ичида)"],
        ["Бемор профили", "✅ PatientProfile.tsx", "✅ PatientProfile.tsx", "✅ PatientDetail.tsx"],
        ["Бемор дашборди", "❌ Йўқ", "✅ PatientDashboard.tsx", "✅ PatientHome.tsx"],
        ["Дорилар мониторинги", "✅ Medications.tsx", "✅ Medications.tsx", "❌ Йўқ"],
        ["Огоҳлантиришлар", "✅ Alerts.tsx", "✅ Alerts.tsx", "❌ Йўқ"],
        ["Аналитика", "❌ Йўқ", "✅ Analytics.tsx", "❌ Йўқ"],
        ["Ҳисоботлар", "❌ Йўқ", "✅ Reports.tsx", "❌ Йўқ"],
        ["Трансплантация киритиш", "❌ Йўқ", "✅ TransplantEntry.tsx", "✅ AddPatient.tsx"],
        ["Натижалар янгилаш", "❌ Йўқ", "✅ OutcomesUpdate.tsx", "❌ Йўқ"],
        ["Логин", "❌ Йўқ", "✅ Login.tsx", "✅ Login.tsx"],
        ["Парол тиклаш", "❌ Йўқ", "❌ Йўқ", "✅ ResetPassword.tsx"],
        ["Роль танлаш", "❌ Йўқ", "❌ Йўқ", "✅ SelectRole.tsx"],
        ["Саҳифалар сони", "6 та", "13 та", "9 та"],
      ],
    },
    {
      category: "АРХИТЕКТУРА ВА ФУНКЦИЯЛАР",
      rows: [
        ["Кўп тиллилик (i18n)", "❌ Йўқ", "✅ src/i18n/ (UZ, RU, EN)", "✅ useLanguage hook (UZ, RU, EN)"],
        ["Контекстлар (Context)", "❌ Йўқ", "✅ src/contexts/", "❌ Йўқ"],
        ["Маълумотлар манбаи", "Статик (src/data/)", "Контекст орқали", "Supabase (backend)"],
        ["Аутентификация", "❌ Йўқ", "❌ Йўқ (фақат UI)", "✅ Supabase Auth"],
        ["Backend интеграция", "❌ Йўқ", "❌ Йўқ", "✅ Supabase (integrations/)"],
        ["Роллар тизими", "❌ Йўқ", "❌ Йўқ", "✅ src/types/roles.ts"],
        ["Тест файллар", "❌ Йўқ", "❌ Йўқ", "✅ src/test/"],
        ["Лаборатория натижалари", "❌ Йўқ", "❌ Йўқ", "✅ AddLabDialog, LabHistoryTable"],
        ["Тил танлагич компонент", "❌ Йўқ", "❌ Йўқ", "✅ LanguageSelector.tsx"],
      ],
    },
    {
      category: "КОМПОНЕНТЛАР ТУЗИЛИШИ",
      rows: [
        ["Layout компонентлар", "✅ layout/", "✅ layout/", "❌ Йўқ"],
        ["Dashboard компонентлар", "✅ dashboard/", "✅ dashboard/", "❌ Йўқ"],
        ["Бемор компонентлар", "✅ patients/", "✅ recipient/", "❌ Йўқ (саҳифа ичида)"],
        ["UI компонентлар (Shadcn)", "✅", "✅", "✅"],
      ],
    },
    {
      category: "ДАВЛАТ/МАРКАЗ БОШҚАРУВИ",
      rows: [
        ["Давлат танлаш", "❌ Йўқ", "✅ Ўзбекистон/Бошқа давлат", "❌ Йўқ"],
        ["Марказлар рўйхати", "❌ Йўқ", "✅ 4 та марказ (Тошкент)", "❌ Йўқ"],
        ["Қўлда марказ киритиш", "❌ Йўқ", "✅ Бошқа давлат учун", "❌ Йўқ"],
        ["Бўш жой (янги марказ)", "❌ Йўқ", "✅ Кўшимча марказ", "❌ Йўқ"],
      ],
    },
  ];

  const localizedData = tableData.map(section => ({ category: td(section.category), rows: section.rows.map(row => row.map(td)) }));

  const copyTable = () => {
    let text = "";
    localizedData.forEach((section) => {
      text += `\n${"=".repeat(100)}\n`;
      text += `${section.category}\n`;
      text += `${"=".repeat(100)}\n`;
      const headers = [td("Хусусият"), "Health C R", "Dream Weaver", "Transplant Guardian"];
      const colWidths = [30, 22, 22, 22];
      text += headers.map((h, i) => h.padEnd(colWidths[i])).join(" | ") + "\n";
      text += colWidths.map((w) => "-".repeat(w)).join("-+-") + "\n";
      section.rows.forEach((row) => {
        text += row.map((cell, i) => cell.padEnd(colWidths[i])).join(" | ") + "\n";
      });
    });

    navigator.clipboard.writeText(text).then(() => {
      alert(td("Жадвал нусха олинди! ✅"));
    });
  };

  const copyMarkdown = () => {
    let md = `# ${tx("Project comparison")}\n\n`;
    localizedData.forEach((section) => {
      md += `## ${section.category}\n\n`;
      md += `| ${td("Хусусият")} | Health C R | Dream Weaver | Transplant Guardian |\n`;
      md += "|----------|-----------|--------------|---------------------|\n";
      section.rows.forEach((row) => {
        md += `| ${row.join(" | ")} |\n`;
      });
      md += "\n";
    });

    navigator.clipboard.writeText(md).then(() => {
      alert(td("Markdown жадвал нусха олинди! ✅"));
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            {tx("Project comparison")}
          </h1>
          <div className="flex flex-wrap gap-2">
            <LanguageSelector />
            <Button
              onClick={copyTable}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {tx("Copy text")}
            </Button>
            <Button
              onClick={copyMarkdown}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              {tx("Copy Markdown")}
            </Button>
          </div>
        </div>

        {localizedData.map((section, si) => (
          <div key={si} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {section.category}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    <th className="p-3 text-left font-semibold text-muted-foreground">{td("Хусусият")}</th>
                    <th className="p-3 text-left font-semibold text-muted-foreground">Health C R</th>
                    <th className="p-3 text-left font-semibold text-muted-foreground">Dream Weaver</th>
                    <th className="p-3 text-left font-semibold text-muted-foreground">Transplant Guardian</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className={`border-b border-border transition-colors hover:bg-muted/50 ${
                        ri % 2 === 0 ? "bg-background" : "bg-muted/20"
                      }`}
                    >
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={`p-3 ${ci === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Index;
