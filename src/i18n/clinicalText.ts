import type { Language } from "@/hooks/useLanguage";

/**
 * Deterministic localizer for machine-generated clinical strings
 * (ClinicalLogic warnings, threshold messages, stage labels, alert titles).
 * Every English template emitted by the engine must have a pattern here;
 * unknown text is returned unchanged.
 */
type L = Exclude<Language, "en">;

const PARAM: Record<string, Record<L, string>> = {
  total_bilirubin: { uz: "Umumiy bilirubin", ru: "Общий билирубин" },
  direct_bilirubin: { uz: "To'g'ri bilirubin", ru: "Прямой билирубин" },
  creatinine: { uz: "Kreatinin", ru: "Креатинин" },
  alt: { uz: "ALT", ru: "АЛТ" },
  ast: { uz: "AST", ru: "АСТ" },
  ggt: { uz: "GGT", ru: "ГГТ" },
  alp: { uz: "Ishqoriy fosfataza", ru: "Щелочная фосфатаза" },
  albumin: { uz: "Albumin", ru: "Альбумин" },
  egfr: { uz: "eGFR", ru: "СКФ" },
  potassium: { uz: "Kaliy", ru: "Калий" },
  sodium: { uz: "Natriy", ru: "Натрий" },
  calcium: { uz: "Kalsiy", ru: "Кальций" },
  magnesium: { uz: "Magniy", ru: "Магний" },
  phosphorus: { uz: "Fosfor", ru: "Фосфор" },
  urea: { uz: "Mochevina", ru: "Мочевина" },
  bun: { uz: "BUN", ru: "АМК" },
  hemoglobin: { uz: "Gemoglobin", ru: "Гемоглобин" },
  platelets: { uz: "Trombotsitlar", ru: "Тромбоциты" },
  wbc: { uz: "Leykotsitlar", ru: "Лейкоциты" },
  inr: { uz: "INR", ru: "МНО" },
  proteinuria: { uz: "Proteinuriya", ru: "Протеинурия" },
  glucose: { uz: "Glyukoza", ru: "Глюкоза" },
  tacrolimus_level: { uz: "Takrolimus", ru: "Такролимус" },
  tacrolimus: { uz: "Takrolimus", ru: "Такролимус" },
};

export function localizeParam(name: string, lang: Language): string {
  const key = name.toLowerCase();
  if (lang === "en") return name;
  return PARAM[key]?.[lang] ?? name;
}

const SEV: Record<string, Record<L, string>> = {
  critical: { uz: "kritik", ru: "критично" },
  warning: { uz: "ogohlantirish", ru: "предупреждение" },
};

type Rule = { re: RegExp; out: Record<L, (m: RegExpMatchArray, lang: L) => string> };

const stageRe = /(early|intermediate|maintenance) \(([^)]+)\)/g;
const STAGE: Record<string, Record<L, string>> = {
  early: { uz: "erta davr", ru: "ранний период" },
  intermediate: { uz: "oraliq davr", ru: "промежуточный период" },
  maintenance: { uz: "davomiy davr", ru: "поддерживающий период" },
  unknown: { uz: "noma'lum davr", ru: "период неизвестен" },
};
const unitWords = (s: string, lang: L) =>
  s.replace(/(\d+)\s*mo\b/g, (_, n) => `${n} ${lang === "uz" ? "oy" : "мес"}`);

export function localizeStage(text: string, lang: Language): string {
  if (lang === "en") return text;
  if (text === "unknown") return STAGE.unknown[lang];
  return text.replace(stageRe, (_, k: string, r: string) => `${STAGE[k][lang]} (${unitWords(r, lang)})`);
}

const RULES: Rule[] = [
  { re: /^(\w+) critically abnormal$/, out: {
    uz: (m, l) => `${localizeParam(m[1], l)} — kritik darajada o'zgargan`,
    ru: (m, l) => `${localizeParam(m[1], l)} — критическое отклонение` } },
  { re: /^(\w+) ([\d.]+) (\S+) (≥|≤) ([\d.]+) \((critical|warning)\)$/, out: {
    uz: (m, l) => `${localizeParam(m[1], l)} ${m[2]} ${m[3]} ${m[4]} ${m[5]} (${SEV[m[6]][l]})`,
    ru: (m, l) => `${localizeParam(m[1], l)} ${m[2]} ${m[3]} ${m[4]} ${m[5]} (${SEV[m[6]][l]})` } },
  { re: /^(\w+) data not available$/, out: {
    uz: (m, l) => `${localizeParam(m[1], l)} ma'lumoti yo'q`,
    ru: (m, l) => `Нет данных: ${localizeParam(m[1], l)}` } },
  { re: /^Tacrolimus outside target$/, out: { uz: () => "Takrolimus maqsadli diapazondan tashqarida", ru: () => "Такролимус вне целевого диапазона" } },
  { re: /^Tacrolimus ([\d.]+) ng\/mL is outside the target range \[([^\]]+)\] for (.+)$/, out: {
    uz: (m, l) => `Takrolimus ${m[1]} ng/mL maqsadli diapazondan [${m[2]}] tashqarida — ${localizeStage(m[3], l)}`,
    ru: (m, l) => `Такролимус ${m[1]} нг/мл вне целевого диапазона [${m[2]}] — ${localizeStage(m[3], l)}` } },
  { re: /^Tacrolimus data missing$/, out: { uz: () => "Takrolimus ma'lumoti yo'q", ru: () => "Нет данных по такролимусу" } },
  { re: /^Tacrolimus data missing — cannot assess immunosuppression level$/, out: { uz: () => "Takrolimus ma'lumoti yo'q — immunosupressiya darajasini baholab bo'lmaydi", ru: () => "Нет данных по такролимусу — невозможно оценить уровень иммуносупрессии" } },
  { re: /^Early post-transplant$/, out: { uz: () => "Transplantatsiyadan keyingi erta davr", ru: () => "Ранний посттрансплантационный период" } },
  { re: /^(\d+) days since transplant — higher baseline risk$/, out: {
    uz: (m) => `Transplantatsiyadan ${m[1]} kun o'tdi — boshlang'ich xavf yuqori`,
    ru: (m) => `${m[1]} дн. после трансплантации — повышенный базовый риск` } },
  { re: /^Re-transplant$/, out: { uz: () => "Qayta transplantatsiya", ru: () => "Повторная трансплантация" } },
  { re: /^Re-transplant patient — elevated rejection risk$/, out: { uz: () => "Qayta transplantatsiya qilingan bemor — rad etish xavfi yuqori", ru: () => "Повторная трансплантация — повышенный риск отторжения" } },
  { re: /^Dialysis history$/, out: { uz: () => "Dializ tarixi", ru: () => "Диализ в анамнезе" } },
  { re: /^Previous dialysis increases baseline risk$/, out: { uz: () => "Avvalgi dializ boshlang'ich xavfni oshiradi", ru: () => "Предшествующий диализ повышает базовый риск" } },
  { re: /^Blood type mismatch$/, out: { uz: () => "Qon guruhi mos emas", ru: () => "Несовместимость групп крови" } },
  { re: /^Patient (\S+) \/ Donor (\S+)( \(titer therapy done\))?$/, out: {
    uz: (m) => `Bemor ${m[1]} / Donor ${m[2]}${m[3] ? " (titr terapiyasi o'tkazilgan)" : ""}`,
    ru: (m) => `Пациент ${m[1]} / Донор ${m[2]}${m[3] ? " (титр-терапия проведена)" : ""}` } },
  { re: /^Potential rejection or toxicity$/, out: { uz: () => "Ehtimoliy rad etish yoki toksiklik", ru: () => "Возможное отторжение или токсичность" } },
  { re: /^Warning: Risk score (\d+)\/100\. Consult (\w+) protocols immediately\.$/, out: {
    uz: (m) => `Diqqat: xavf bahosi ${m[1]}/100. Zudlik bilan ${m[2]} protokollariga murojaat qiling.`,
    ru: (m) => `Внимание: оценка риска ${m[1]}/100. Срочно сверьтесь с протоколами ${m[2]}.` } },
];

/** Fixed server-generated alert titles (stored in Uzbek). */
const FIXED: Record<string, Record<Language, string>> = {
  "Tahlil natijasi e'tiborga loyiq": { uz: "Tahlil natijasi e'tiborga loyiq", ru: "Результат анализа требует внимания", en: "Lab result needs attention" },
  "Shifokor bilan maslahatlashish tavsiya etiladi": { uz: "Shifokor bilan maslahatlashish tavsiya etiladi", ru: "Рекомендуется консультация врача", en: "Consultation with a doctor is recommended" },
  "Jiddiy og'shish aniqlandi!": { uz: "Jiddiy og'shish aniqlandi!", ru: "Обнаружено серьёзное отклонение!", en: "Serious deviation detected!" },
  "Dori dozasi o'zgartirildi": { uz: "Dori dozasi o'zgartirildi", ru: "Доза препарата изменена", en: "Medication dose changed" },
};

export function localizeClinicalText(text: string | null | undefined, lang: Language): string {
  if (!text) return "";
  const fixed = FIXED[text.trim()];
  if (fixed) return fixed[lang];
  if (lang === "en") return text;
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) return r.out[lang](m, lang);
  }
  return localizeStage(text, lang);
}
