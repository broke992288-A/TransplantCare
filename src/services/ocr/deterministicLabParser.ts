/**
 * Deterministic Lab Parser
 *
 * Input: raw text extracted from a PDF / TXT / CSV.
 * Output: array of date groups in the same shape as the OCR edge function,
 * so the UI does not need to differentiate the source.
 *
 * Strategy:
 *   1. Detect dates in the document (header lines or `Date:` labels).
 *   2. For each line, match the longest canonical lab alias.
 *   3. Extract the first plausible numeric value on the line.
 *   4. Attribute to the nearest preceding date (or "unknown").
 *
 * No AI, no async, no network. Pure CPU.
 */

import { matchCanonicalKey, type CanonicalLabKey, LAB_ALIASES } from "./labAliases";
import { extractPrintedUnit, type UnitSource } from "./unitDetection";

export interface ParsedDateGroup {
  date: string; // ISO YYYY-MM-DD or "unknown"
  data: Partial<Record<CanonicalLabKey, number | null>>;
  confidence: Partial<Record<CanonicalLabKey, number>>;
  originalText: Partial<Record<CanonicalLabKey, string>>;
  /** Printed unit captured per field (empty string when not found). */
  units: Partial<Record<CanonicalLabKey, string>>;
  /** Per-field unit_source: "detected" when printed unit captured, else "unknown". */
  unitSources: Partial<Record<CanonicalLabKey, UnitSource>>;
}

export interface ParsedPatientIdentity {
  name?: string | null;
  dob?: string | null;
  mrn?: string | null;
}

export interface DeterministicParseResult {
  dateGroups: ParsedDateGroup[];
  markerCount: number;
  sufficient: boolean;
  durationMs: number;
  /** Patient identity extracted from header lines (best-effort). */
  patientIdentity?: ParsedPatientIdentity;
}

/** Min unique markers required to consider parse "sufficient" (skip AI). */
const MIN_MARKERS_SUFFICIENT = 3;

/** Default confidence for deterministic regex hit. */
const REGEX_CONFIDENCE = 95;

// ────────────────────────────────────────────────────────────────────
// Date detection
// ────────────────────────────────────────────────────────────────────

const DATE_PATTERNS: RegExp[] = [
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/,
  // YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD
  /\b(\d{4})[./-](\d{1,2})[./-](\d{1,2})\b/,
];

interface DateHit {
  line: number;
  iso: string;
}

function toIsoDate(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function parseDateFromMatch(match: RegExpMatchArray, isYearFirst: boolean): string | null {
  const a = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);
  const c = parseInt(match[3], 10);
  if (isYearFirst) return toIsoDate(a, b, c);
  return toIsoDate(c, b, a);
}

function findDates(lines: string[]): DateHit[] {
  const hits: DateHit[] = [];
  lines.forEach((line, i) => {
    for (const pat of DATE_PATTERNS) {
      const m = line.match(pat);
      if (!m) continue;
      const isYearFirst = m[1].length === 4;
      const iso = parseDateFromMatch(m, isYearFirst);
      if (iso) {
        hits.push({ line: i, iso });
        break;
      }
    }
  });
  return hits;
}

// ────────────────────────────────────────────────────────────────────
// Number extraction
// ────────────────────────────────────────────────────────────────────

/**
 * Extract the first plausible numeric value from a line, after the alias.
 * Handles `1.23`, `1,23` (comma decimal), negatives, and trims units.
 * Rejects 4-digit integers in 1990-2100 range (likely years).
 */
function extractValue(line: string, aliasIndex: number): number | null {
  const tail = line.slice(aliasIndex);
  // Match number tokens; require at least one digit; allow comma OR dot decimal.
  const re = /-?\d+(?:[.,]\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tail)) !== null) {
    const raw = m[0].replace(",", ".");
    const num = parseFloat(raw);
    if (!Number.isFinite(num)) continue;
    // Skip 4-digit years
    const isInt = !raw.includes(".");
    if (isInt && num >= 1990 && num <= 2100) continue;
    return num;
  }
  return null;
}

/** Find the lowercase index of the matched alias on the line (for tail extraction). */
function aliasMatchIndex(line: string, key: CanonicalLabKey): number {
  const lower = line.toLowerCase();
  const aliases = LAB_ALIASES[key];
  let best = -1;
  let bestLen = 0;
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx >= 0 && alias.length > bestLen) {
      best = idx + alias.length;
      bestLen = alias.length;
    }
  }
  return best >= 0 ? best : 0;
}

// ────────────────────────────────────────────────────────────────────
// Patient identity extraction (deterministic, header-scan only)
// ────────────────────────────────────────────────────────────────────

const NAME_LABELS = [
  "patient name", "patient", "name", "ф.и.о", "фио", "пациент", "ism sharif", "bemor",
];
const DOB_LABELS = [
  "date of birth", "dob", "d.o.b", "birth date", "born", "дата рождения", "д.р.", "tug'ilgan",
];
const MRN_LABELS = [
  "mrn", "medical record", "patient id", "patient no", "patient #", "hospital id",
  "id no", "uhid", "ip no", "mr no", "mrn no", "карта", "ист.болезни", "история болезни",
];

function cleanFieldValue(s: string): string {
  return s.replace(/[\s:|·•\-–—]+$/g, "").replace(/^[\s:|·•\-–—]+/g, "").trim();
}

function findLabeledValue(line: string, labels: string[]): string | null {
  const lower = line.toLowerCase();
  for (const label of labels) {
    const idx = lower.indexOf(label);
    if (idx < 0) continue;
    // ensure word-boundary-ish on the left
    if (idx > 0 && /[a-zа-я0-9]/i.test(lower[idx - 1])) continue;
    const after = line.slice(idx + label.length);
    // require a separator (: or whitespace) before the value
    const sepMatch = after.match(/^\s*[:\-]?\s*(.+)$/);
    if (!sepMatch) continue;
    const val = cleanFieldValue(sepMatch[1]);
    if (val) return val;
  }
  return null;
}

/** Normalize a captured DOB string to YYYY-MM-DD when possible. */
function normalizeDob(raw: string): string | null {
  const m = raw.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) {
    const iso = toIsoDate(parseInt(m[3], 10), parseInt(m[2], 10), parseInt(m[1], 10));
    if (iso) return iso;
  }
  const m2 = raw.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m2) {
    const iso = toIsoDate(parseInt(m2[1], 10), parseInt(m2[2], 10), parseInt(m2[3], 10));
    if (iso) return iso;
  }
  return null;
}

/** Looks like a plausible person name: 2+ tokens, letters only, no digits. */
function looksLikeName(raw: string): boolean {
  if (!raw || raw.length < 3 || raw.length > 80) return false;
  if (/\d/.test(raw)) return false;
  const tokens = raw.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length < 2) return false;
  return tokens.every((t) => /^[A-Za-zА-Яа-яЁёЎўҚқҒғҲҳ'’.\-]+$/.test(t));
}

function looksLikeMrn(raw: string): boolean {
  if (!raw || raw.length < 2 || raw.length > 32) return false;
  // alphanumerics with optional separators, must contain a digit
  if (!/\d/.test(raw)) return false;
  return /^[A-Za-z0-9._\-/]+$/.test(raw.split(/\s+/)[0]);
}

function extractPatientIdentity(lines: string[]): ParsedPatientIdentity | undefined {
  // Scan only the header (first ~25 non-empty lines) to avoid mid-report false positives.
  const header = lines.slice(0, 25);
  let name: string | null = null;
  let dob: string | null = null;
  let mrn: string | null = null;

  for (const line of header) {
    if (!name) {
      const v = findLabeledValue(line, NAME_LABELS);
      if (v) {
        // strip trailing tokens (e.g., "John Doe Age 45") — take alpha run from start
        const cleaned = cleanFieldValue(v.split(/\s{2,}|\|/)[0]);
        if (looksLikeName(cleaned)) name = cleaned;
      }
    }
    if (!dob) {
      const v = findLabeledValue(line, DOB_LABELS);
      if (v) {
        const iso = normalizeDob(v);
        if (iso) dob = iso;
      }
    }
    if (!mrn) {
      const v = findLabeledValue(line, MRN_LABELS);
      if (v) {
        const token = v.split(/\s+/)[0];
        if (looksLikeMrn(token)) mrn = token;
      }
    }
    if (name && dob && mrn) break;
  }

  if (!name && !dob && !mrn) return undefined;
  return { name, dob, mrn };
}

export function parseLabText(rawText: string): DeterministicParseResult {
  const t0 = performance.now();
  const text = rawText.replace(/\r\n?/g, "\n");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const dateHits = findDates(lines);
  const uniqueDates = Array.from(new Set(dateHits.map((d) => d.iso)));
  const patientIdentity = extractPatientIdentity(lines);

  // Group factory
  const ensureGroup = (
    map: Map<string, ParsedDateGroup>,
    date: string
  ): ParsedDateGroup => {
    let g = map.get(date);
    if (!g) {
      g = { date, data: {}, confidence: {}, originalText: {}, units: {}, unitSources: {} };
      map.set(date, g);
    }
    return g;
  };

  const groupsMap = new Map<string, ParsedDateGroup>();

  // If exactly one date in document → attribute everything to it.
  // If multiple → attribute to nearest preceding date hit.
  // If none → "unknown".
  const singleDate = uniqueDates.length === 1 ? uniqueDates[0] : null;

  let markerCount = 0;

  lines.forEach((line, lineIdx) => {
    const key = matchCanonicalKey(line);
    if (!key) return;

    const aliasEnd = aliasMatchIndex(line, key);
    const value = extractValue(line, aliasEnd);
    if (value === null) return;

    let dateForLine: string;
    if (singleDate) {
      dateForLine = singleDate;
    } else if (uniqueDates.length === 0) {
      dateForLine = "unknown";
    } else {
      // nearest preceding date
      let chosen = "unknown";
      for (const d of dateHits) {
        if (d.line <= lineIdx) chosen = d.iso;
        else break;
      }
      dateForLine = chosen;
    }

    const group = ensureGroup(groupsMap, dateForLine);
    if (group.data[key] != null) return;
    group.data[key] = value;
    group.confidence[key] = REGEX_CONFIDENCE;
    group.originalText[key] = line.length > 120 ? line.slice(0, 120) + "…" : line;
    const tail = line.slice(aliasEnd);
    const printedUnit = extractPrintedUnit(tail);
    group.units[key] = printedUnit ?? "";
    group.unitSources[key] = printedUnit ? "detected" : "unknown";
    markerCount++;
  });

  const dateGroups = Array.from(groupsMap.values());
  const sufficient = markerCount >= MIN_MARKERS_SUFFICIENT;

  return {
    dateGroups,
    markerCount,
    sufficient,
    durationMs: Math.round(performance.now() - t0),
  };
}
