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

export interface DeterministicParseResult {
  dateGroups: ParsedDateGroup[];
  markerCount: number;
  sufficient: boolean;
  durationMs: number;
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
// Main parser
// ────────────────────────────────────────────────────────────────────

export function parseLabText(rawText: string): DeterministicParseResult {
  const t0 = performance.now();
  const text = rawText.replace(/\r\n?/g, "\n");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const dateHits = findDates(lines);
  const uniqueDates = Array.from(new Set(dateHits.map((d) => d.iso)));

  // Group factory
  const ensureGroup = (
    map: Map<string, ParsedDateGroup>,
    date: string
  ): ParsedDateGroup => {
    let g = map.get(date);
    if (!g) {
      g = { date, data: {}, confidence: {}, originalText: {} };
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
    // Don't overwrite if already set (first occurrence wins).
    if (group.data[key] != null) return;
    group.data[key] = value;
    group.confidence[key] = REGEX_CONFIDENCE;
    group.originalText[key] = line.length > 120 ? line.slice(0, 120) + "…" : line;
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
