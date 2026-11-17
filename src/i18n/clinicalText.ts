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
  bilirubin: { uz: "Bilirubin", ru: "Билирубин" },
  hb: { uz: "Gemoglobin", ru: "Гемоглобин" },
  tlc: { uz: "Leykotsitlar", ru: "Лейкоциты" },
  pti: { uz: "Protrombin indeksi", ru: "Протромбиновый индекс" },
  total_protein: { uz: "Umumiy oqsil", ru: "Общий белок" },
  recorded_at: { uz: "Sana", ru: "Дата" },
  tacrolimus_dose: { uz: "Takrolimus dozasi", ru: "Доза такролимуса" },
  mmf_dose: { uz: "MMF dozasi", ru: "Доза MMF" },
  steroid_dose: { uz: "Steroid dozasi", ru: "Доза стероида" },
  uric_acid: { uz: "Siydik kislotasi", ru: "Мочевая кислота" },
  ammonia: { uz: "Ammiak", ru: "Аммиак" },
  cyclosporine: { uz: "Siklosporin", ru: "Циклоспорин" },
  crp: { uz: "C-reaktiv oqsil", ru: "С-реактивный белок" },
  esr: { uz: "Eritrotsitlar cho'kish tezligi", ru: "Скорость оседания эритроцитов" },
  ldh: { uz: "Laktatdegidrogenaza", ru: "Лактатдегидрогеназа" },
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

const VALIDATION_RULES: { re: RegExp; out: (m: RegExpMatchArray, lang: Language) => string }[] = [
  { re: /^(.+?) — (raqam kiriting|noto'g'ri raqam|fiziologik jihatdan imkonsiz qiymat)$/, out: (m, lang) => {
    const label = localizeParam(m[1], lang);
    const reason = m[2] === "raqam kiriting" ? { uz: "raqam kiriting", ru: "введите число", en: "enter a number" }
      : m[2] === "noto'g'ri raqam" ? { uz: "noto'g'ri raqam", ru: "неверное число", en: "invalid number" }
      : { uz: "fiziologik jihatdan imkonsiz qiymat", ru: "физиологически невозможное значение", en: "physiologically impossible value" };
    return `${label} — ${reason[lang]}`;
  } },
  { re: /^(.+) manfiy bo'lishi mumkin emas$/, out: (m, lang) => `${localizeParam(m[1], lang)} ${lang === "ru" ? "не может быть отрицательным" : lang === "en" ? "cannot be negative" : "manfiy bo'lishi mumkin emas"}` },
  { re: /^(\w+) = (.+) — fiziologik jihatdan imkonsiz \((.+)\)$/, out: (m, lang) => `${localizeParam(m[1], lang)} = ${m[2]} — ${lang === "ru" ? "физиологически невозможно" : lang === "en" ? "physiologically impossible" : "fiziologik jihatdan imkonsiz"} (${m[3]})` },
  { re: /^(\w+) = (.+) — g'ayrioddiy qiymat, tekshirishni tavsiya etamiz$/, out: (m, lang) => `${localizeParam(m[1], lang)} = ${m[2]} — ${lang === "ru" ? "необычное значение, рекомендуется проверка" : lang === "en" ? "unusual value, verification recommended" : "g'ayrioddiy qiymat, tekshirish tavsiya etiladi"}` },
  { re: /^To'g'ridan-to'g'ri bilirubin \((.+)\) umumiy bilirubindan \((.+)\) katta bo'lishi mumkin emas$/, out: (m, lang) => lang === "en" ? `Direct bilirubin (${m[1]}) cannot exceed total bilirubin (${m[2]})` : lang === "ru" ? `Прямой билирубин (${m[1]}) не может превышать общий билирубин (${m[2]})` : `To'g'ri bilirubin (${m[1]}) umumiy bilirubindan (${m[2]}) katta bo'lishi mumkin emas` },
];

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
  { re: /^(.+) increased (\d+)%$/, out: {
    uz: (m, l) => `${localizeParam(m[1], l)} ${m[2]}% oshgan`,
    ru: (m, l) => `${localizeParam(m[1], l)} вырос на ${m[2]}%` } },
  { re: /^Risk level: HIGH \(score ([^)]+)\)$/, out: {
    uz: (m) => `Xavf darajasi: yuqori (baho ${m[1]})`,
    ru: (m) => `Уровень риска: высокий (оценка ${m[1]})` } },
  { re: /^(?:\[HELD\]|HELD)\s*(.*)$/s, out: {
    uz: (m) => `Vaqtincha to'xtatilgan ${m[1]}`.trim(),
    ru: (m) => `Временно приостановлено ${m[1]}`.trim() } },
  { re: /^Quick (increase|decrease) by doctor$/, out: {
    uz: (m) => `Shifokor dozani ${m[1] === "increase" ? "oshirdi" : "kamaytirdi"}`,
    ru: (m) => `Врач ${m[1] === "increase" ? "увеличил" : "уменьшил"} дозу` } },
  { re: /^(\w+) critically abnormal$/, out: {
    uz: (m, l) => `${localizeParam(m[1], l)} — kritik darajada o'zgargan`,
    ru: (m, l) => `${localizeParam(m[1], l)} — критическое отклонение` } },
  { re: /^(\w+) ([+-]?[\d.]+(?:e[+-]?\d+)?) (\S+) (≥|≤) ([+-]?[\d.]+(?:e[+-]?\d+)?) \((critical|warning)\)$/i, out: {
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
  "Critical creatinine elevation": { en: "Critical creatinine elevation", uz: "Kreatinin kritik darajada oshgan", ru: "Критическое повышение креатинина" },
  "Subtherapeutic tacrolimus — rejection risk": { en: "Subtherapeutic tacrolimus — rejection risk", uz: "Takrolimus davolash diapazonidan past — rad etish xavfi", ru: "Такролимус ниже терапевтического диапазона — риск отторжения" },
  "Toxic tacrolimus level": { en: "Toxic tacrolimus level", uz: "Takrolimus toksik darajada", ru: "Токсический уровень такролимуса" },
  "Severe hyperkalemia": { en: "Severe hyperkalemia", uz: "Og'ir giperkaliyemiya", ru: "Тяжёлая гиперкалиемия" },
  "Critical ALT elevation": { en: "Critical ALT elevation", uz: "ALT kritik darajada oshgan", ru: "Критическое повышение АЛТ" },
  "Critical AST elevation": { en: "Critical AST elevation", uz: "AST kritik darajada oshgan", ru: "Критическое повышение АСТ" },
  "Critical hyperbilirubinemia": { en: "Critical hyperbilirubinemia", uz: "Kritik giperbilirubinemiya", ru: "Критическая гипербилирубинемия" },
  "Critical kidney function decline": { en: "Critical kidney function decline", uz: "Buyrak faoliyati kritik darajada pasaygan", ru: "Критическое снижение функции почек" },
  "Medication held by doctor": { en: "Medication held by doctor", uz: "Shifokor dorini vaqtincha to'xtatdi", ru: "Врач временно приостановил препарат" },
  "Medication restarted by doctor": { en: "Medication restarted by doctor", uz: "Shifokor dorini qayta boshladi", ru: "Врач возобновил препарат" },
  "Tahlil natijasi e'tiborga loyiq": { uz: "Tahlil natijasi e'tiborga loyiq", ru: "Результат анализа требует внимания", en: "Lab result needs attention" },
  "Shifokor bilan maslahatlashish tavsiya etiladi": { uz: "Shifokor bilan maslahatlashish tavsiya etiladi", ru: "Рекомендуется консультация врача", en: "Consultation with a doctor is recommended" },
  "Jiddiy og'shish aniqlandi!": { uz: "Jiddiy og'shish aniqlandi!", ru: "Обнаружено серьёзное отклонение!", en: "Serious deviation detected!" },
  "Dori dozasi o'zgartirildi": { uz: "Dori dozasi o'zgartirildi", ru: "Доза препарата изменена", en: "Medication dose changed" },
};

export function localizeClinicalText(text: string | null | undefined, lang: Language): string {
  if (!text) return "";
  const fixed = FIXED[text.trim()];
  if (fixed) return fixed[lang];
  for (const rule of VALIDATION_RULES) {
    const match = text.match(rule.re);
    if (match) return rule.out(match, lang);
  }
  if (lang === "en") return text;
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m) return r.out[lang](m, lang);
  }
  // Stored alerts may contain a title plus a threshold or several warnings.
  const colon = text.indexOf(": ");
  if (colon > 0) {
    const left = localizeClinicalText(text.slice(0, colon), lang);
    const right = localizeClinicalText(text.slice(colon + 2), lang);
    if (left !== text.slice(0, colon) || right !== text.slice(colon + 2)) return `${left}: ${right}`;
  }
  const parts = text.split(/(;\s*|\. (?=[A-Z_]))/);
  if (parts.length > 1) return parts.map((part, i) => i % 2 ? part : localizeClinicalText(part, lang)).join("");
  if (/\b(?:\w+:?\s*[\d.]+\s*(?:mg\/dL|ng\/mL|U\/L|mmol\/L)|Dori:|Eski doza:|Yangi doza:|norma\s+[\d.]+)/.test(text)) {
    let localized = text.replace(/\b(total_bilirubin|direct_bilirubin|tacrolimus_level|tacrolimus|creatinine|bilirubin|egfr|potassium|sodium|albumin|platelets|alt|ast|alp|ggt|urea)\b/gi, name => localizeParam(name, lang));
    const words: Record<string, Record<L, string>> = {
      "norma": { uz: "me'yor", ru: "норма" },
      "Dori:": { uz: "Dori:", ru: "Препарат:" },
      "Eski doza:": { uz: "Eski doza:", ru: "Прежняя доза:" },
      "Yangi doza:": { uz: "Yangi doza:", ru: "Новая доза:" },
      "Sabab:": { uz: "Sabab:", ru: "Причина:" },
      "Re-transplant": { uz: "Qayta transplantatsiya", ru: "Повторная трансплантация" },
      "Re-transplant patient": { uz: "Qayta transplantatsiya qilingan bemor", ru: "Пациент после повторной трансплантации" },
      "Multiple abnormal": { uz: "Bir nechta chetlanish", ru: "Несколько отклонений" },
    };
    for (const word of Object.keys(words).sort((a, b) => b.length - a.length)) localized = localized.split(word).join(words[word][lang]);
    return localized;
  }
  return localizeStage(text, lang);
}

/** Machine templates bypass AI even when their source language differs. */
export function isMachineClinicalText(text: string): boolean {
  return Boolean(FIXED[text.trim()]) || VALIDATION_RULES.some(rule => rule.re.test(text)) || localizeClinicalText(text, "uz") !== text;
}
