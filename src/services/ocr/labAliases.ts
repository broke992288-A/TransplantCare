/**
 * Multilingual lab name aliases (EN / RU / UZ) → canonical keys
 * used throughout the app. Lowercase, accent-folded comparison.
 *
 * Add new aliases here only. Do not duplicate elsewhere.
 */

export type CanonicalLabKey =
  | "hb"
  | "tlc"
  | "platelets"
  | "pti"
  | "inr"
  | "total_bilirubin"
  | "direct_bilirubin"
  | "ast"
  | "alt"
  | "alp"
  | "ggt"
  | "total_protein"
  | "albumin"
  | "urea"
  | "creatinine"
  | "egfr"
  | "sodium"
  | "potassium"
  | "calcium"
  | "magnesium"
  | "phosphorus"
  | "uric_acid"
  | "crp"
  | "esr"
  | "ldh"
  | "ammonia"
  | "glucose"
  | "tacrolimus_level"
  | "cyclosporine"
  | "proteinuria";

/**
 * Map of canonical key → list of aliases (lowercase, no diacritics).
 * Order matters: longer / more specific aliases first to avoid partial matches.
 */
export const LAB_ALIASES: Record<CanonicalLabKey, string[]> = {
  // Hematology
  hb: ["hemoglobin", "haemoglobin", "gemoglobin", "гемоглобин", "gemoglobin", "hgb", "hb"],
  tlc: ["total leukocyte count", "white blood cells", "leukocytes", "лейкоциты", "лейкоцитлар", "wbc", "tlc"],
  platelets: ["platelet count", "platelets", "тромбоциты", "тромбоцитлар", "thrombocytes", "plt"],
  pti: ["prothrombin index", "пти", "протромбин индекси", "pti"],
  inr: ["international normalized ratio", "мно", "inr"],

  // Hepatic
  total_bilirubin: ["total bilirubin", "общий билирубин", "умумий билирубин", "t.bil", "tbil", "total bili"],
  direct_bilirubin: ["direct bilirubin", "conjugated bilirubin", "прямой билирубин", "тугридан тугри билирубин", "тўғридан-тўғри билирубин", "d.bil", "dbil"],
  ast: ["aspartate aminotransferase", "sgot", "аспартатаминотрансфераза", "асат", "аст", "ast"],
  alt: ["alanine aminotransferase", "sgpt", "аланинаминотрансфераза", "алат", "алт", "alt"],
  alp: ["alkaline phosphatase", "щелочная фосфатаза", "щел фосфатаза", "ишкорий фосфатаза", "ишқорий фосфатаза", "alk phos", "щф", "sap", "alp"],
  ggt: ["gamma glutamyl transferase", "гамма-глутамилтрансфераза", "gamma gt", "гамма гт", "ггтп", "ггт", "ggt"],
  total_protein: ["total protein", "общий белок", "умумий оксил", "умумий оқсил", "tp"],
  albumin: ["albumin", "альбумин", "альб", "alb"],

  // Renal
  urea: ["blood urea nitrogen", "bun", "мочевина", "мочевины", "сийдик кислотаси", "карбамид", "urea"],
  creatinine: ["creatinine", "креатинин", "креат", "cr"],
  egfr: ["estimated gfr", "egfr", "gfr", "скф"],

  // Electrolytes
  sodium: ["sodium", "натрий", "na+", "na"],
  potassium: ["potassium", "калий", "k+", "k"],
  calcium: ["calcium", "кальций", "ca++", "ca2+", "ca"],
  magnesium: ["magnesium", "магний", "mg++", "mg2+", "mg"],
  phosphorus: ["phosphorus", "phosphate", "фосфор", "p"],

  // Other chemistry
  uric_acid: ["uric acid", "мочевая кислота", "ua"],
  crp: ["c-reactive protein", "c reactive protein", "срб", "crp"],
  esr: ["erythrocyte sedimentation rate", "sed rate", "соэ", "эчт", "esr"],
  ldh: ["lactate dehydrogenase", "лдг", "ldh"],
  ammonia: ["ammonia", "аммиак", "nh3"],
  glucose: ["fasting glucose", "blood glucose", "сахар крови", "қондаги қанд", "қанд миқдори", "glucose", "глюкоза", "қанд", "глю", "glu"],

  // Immunosuppressants
  tacrolimus_level: ["tacrolimus", "такралимус", "такролимус", "tac level", "fk-506", "fk506", "тас", "tac"],
  cyclosporine: ["cyclosporine", "cyclosporin", "циклоспорин", "csa"],

  // Urine
  proteinuria: ["proteinuria", "protein in urine", "urine protein", "протеинурия", "сийдикдаги оксил", "сийдикдаги оқсил"],
};

/**
 * Reverse-built array sorted by length DESC for longest-first matching.
 * Each entry: { canonical, alias, regex }.
 */
export interface AliasEntry {
  canonical: CanonicalLabKey;
  alias: string;
  regex: RegExp;
}

function buildAliasIndex(): AliasEntry[] {
  const entries: AliasEntry[] = [];
  for (const [canonical, aliases] of Object.entries(LAB_ALIASES) as [CanonicalLabKey, string[]][]) {
    for (const alias of aliases) {
      // Word-boundary safe regex; alias may contain spaces/dots/hyphens
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Allow trailing colon, dot, or whitespace; require non-letter on both sides
      const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])(${escaped})(?=[^\\p{L}\\p{N}]|$)`, "iu");
      entries.push({ canonical, alias, regex });
    }
  }
  // Longest aliases first so "total bilirubin" beats "bilirubin"
  entries.sort((a, b) => b.alias.length - a.alias.length);
  return entries;
}

export const ALIAS_INDEX: AliasEntry[] = buildAliasIndex();

/**
 * Find canonical key for a given line/segment of text.
 * Returns the canonical key matching the longest alias found, or null.
 */
export function matchCanonicalKey(line: string): CanonicalLabKey | null {
  const lower = line.toLowerCase();
  for (const entry of ALIAS_INDEX) {
    if (entry.regex.test(lower)) return entry.canonical;
  }
  return null;
}
