import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Loader2, CheckCircle2, Edit3, FileText, AlertTriangle, Calendar, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { upsertLabResult, fetchLabsByPatientId } from "@/services/labService";
import { insertEvent } from "@/services/eventService";
import { logAudit } from "@/services/auditService";
import { computeRiskScoreAsync, insertRiskSnapshot } from "@/services/riskSnapshotService";
import { insertPatientAlert } from "@/services/patientAlertService";
import { processFileOCR } from "@/services/ocr/OCRCoordinator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabReferenceProfiles, useLabCountries } from "@/hooks/useLabReferenceProfiles";
import { validateLabDate } from "@/lib/validations";
import { convertByPrintedUnit } from "@/services/ocr/unitDetection";
import { insertProvenanceRows, type ProvenanceRow } from "@/services/ocr/provenanceService";
import type { CanonicalLabKey } from "@/services/ocr/labAliases";


const LAB_FIELDS = [
  { key: "hb", label: "HB (Hemoglobin)", unit: "g/dL" },
  { key: "tlc", label: "TLC (WBC)", unit: "×10³/µL" },
  { key: "platelets", label: "Platelets", unit: "×10³/µL" },
  { key: "pti", label: "PTI", unit: "%" },
  { key: "inr", label: "INR", unit: "" },
  { key: "total_bilirubin", label: "Total Bilirubin", unit: "mg/dL" },
  { key: "direct_bilirubin", label: "Direct Bilirubin", unit: "mg/dL" },
  { key: "ast", label: "AST (SGOT)", unit: "U/L" },
  { key: "alt", label: "ALT (SGPT)", unit: "U/L" },
  { key: "alp", label: "ALP", unit: "U/L" },
  { key: "ggt", label: "GGT", unit: "U/L" },
  { key: "total_protein", label: "Total Protein", unit: "g/dL" },
  { key: "albumin", label: "Albumin", unit: "g/dL" },
  { key: "urea", label: "Urea", unit: "mg/dL" },
  { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
  { key: "egfr", label: "eGFR", unit: "mL/min" },
  { key: "sodium", label: "Sodium", unit: "mEq/L" },
  { key: "potassium", label: "Potassium", unit: "mEq/L" },
  { key: "calcium", label: "Calcium", unit: "mg/dL" },
  { key: "magnesium", label: "Magnesium", unit: "mg/dL" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg/dL" },
  { key: "uric_acid", label: "Uric Acid", unit: "mg/dL" },
  { key: "crp", label: "CRP", unit: "mg/L" },
  { key: "esr", label: "ESR", unit: "mm/hr" },
  { key: "ldh", label: "LDH", unit: "U/L" },
  { key: "ammonia", label: "Ammonia", unit: "µg/dL" },
  { key: "glucose", label: "Glucose", unit: "mmol/L" },
  { key: "tacrolimus_level", label: "Tacrolimus", unit: "ng/mL" },
  { key: "cyclosporine", label: "Cyclosporine", unit: "ng/mL" },
  { key: "proteinuria", label: "Proteinuria", unit: "mg/dL" },
];

interface Props {
  patientId: string;
  organType?: string;
  patientData?: { transplant_number?: number | null; dialysis_history?: boolean | null; transplant_date?: string | null };
  onLabAdded: () => void;
  patientCountry?: string;
  /** Currently-opened patient identity, used for OCR identity-mismatch safety. */
  patientName?: string | null;
  patientDOB?: string | null;
  patientMRN?: string | null;
}

type Step = "upload" | "processing" | "confirm";

interface PatientIdentity {
  name?: string | null;
  dob?: string | null;
  mrn?: string | null;
}

interface DateGroup {
  date: string;
  values: Record<string, string>;
  confidence: Record<string, number>;
  originalText: Record<string, string>;
  units: Record<string, string>;
  unitSources: Record<string, "detected" | "assumed" | "unknown">;
  patientIdentity?: PatientIdentity;
}

interface OcrDateGroupResponse {
  date?: string;
  data?: Record<string, number | null>;
  confidence?: Record<string, number>;
  originalText?: Record<string, string>;
}

interface OcrResponse {
  error?: string;
  multiDate?: boolean;
  dateGroups?: OcrDateGroupResponse[];
  data?: Record<string, number | null>;
  confidence?: Record<string, number>;
  originalText?: Record<string, string>;
  reportType?: string;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 95) return null;
  if (confidence >= 80) {
    return (
      <span className="ml-1 inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
        {confidence}%
      </span>
    );
  }
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
      <AlertTriangle className="h-2.5 w-2.5" />
      {confidence}%
    </span>
  );
}

function formatDateLocalized(dateStr: string, t: (key: string) => string): string {
  if (dateStr === "unknown") return t("upload.dateNotDetected");
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

/** Country labels for display */
const COUNTRY_LABELS: Record<string, string> = {
  uzbekistan: "🇺🇿 O'zbekiston",
  india: "🇮🇳 India",
};

/** Suspicious thresholds — values above these are highlighted in red */
const SUSPICIOUS_THRESHOLDS: Record<string, number> = {
  alt: 2000, ast: 2000, creatinine: 20, total_bilirubin: 30,
  direct_bilirubin: 20, potassium: 8, sodium: 170, hb: 25,
  platelets: 1000, inr: 10, alp: 1500, ggt: 2000, urea: 300,
  tacrolimus_level: 30, calcium: 15, phosphorus: 10,
};

/**
 * Unit-driven country detection.
 * Sprint A contract: NEVER infer from value magnitude.
 * Switch country only when a printed unit clearly indicates the system
 * (e.g. µmol/L for creatinine → Uzbekistan; mg/dL → India).
 */
function detectCountryFromUnits(group: DateGroup): { country: string; reason: string } | null {
  const crUnit = (group.units.creatinine ?? "").toLowerCase().replace(/μ|µ/g, "u").replace(/\s+/g, "");
  if (crUnit) {
    if (crUnit.includes("umol/l")) return { country: "uzbekistan", reason: `Creatinine unit µmol/L (O'zbekiston)` };
    if (crUnit.includes("mg/dl")) return { country: "india", reason: `Creatinine unit mg/dL (India)` };
  }
  const biliUnit = (group.units.total_bilirubin ?? "").toLowerCase().replace(/μ|µ/g, "u").replace(/\s+/g, "");
  if (biliUnit.includes("umol/l")) return { country: "uzbekistan", reason: `Bilirubin unit µmol/L (O'zbekiston)` };
  return null;
}

function isSuspicious(key: string, value: number): boolean {
  const threshold = SUSPICIOUS_THRESHOLDS[key];
  return threshold != null && value > threshold;
}

// NOTE: Lab values are stored AS-IS in the units of the patient's country.
// Country-specific reference profiles define the matching normal ranges, and
// the risk engine compares against those profiles — no conversion is applied.


/** Normalize a name for fuzzy comparison: lowercased, trimmed, alpha only. */
function normalizeName(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[\u0400-\u04FF]/g, (c) => c) // keep cyrillic
    .replace(/[^a-zа-яё\s]/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Light fuzzy match: shared token count / max token count. */
function nameSimilarity(a: string, b: string): number {
  const at = normalizeName(a).split(" ").filter(Boolean);
  const bt = normalizeName(b).split(" ").filter(Boolean);
  if (at.length === 0 || bt.length === 0) return 0;
  const setB = new Set(bt);
  const shared = at.filter((t) => setB.has(t)).length;
  return shared / Math.max(at.length, bt.length);
}

/** Compare extracted DOB (any format) with stored DOB (YYYY-MM-DD). */
function dobMatches(extracted: string | null | undefined, stored: string | null | undefined): boolean {
  if (!extracted || !stored) return false;
  const norm = (s: string) => s.replace(/[^0-9]/g, "");
  const e = norm(extracted);
  const s = norm(stored);
  if (!e || !s) return false;
  // exact 8-digit match (YYYYMMDD vs DDMMYYYY etc.)
  if (e.length >= 8 && s.length >= 8) {
    const eYYYYMMDD = e.slice(0, 8);
    const sYYYYMMDD = s.slice(0, 8);
    if (eYYYYMMDD === sYYYYMMDD) return true;
    // try reversing DDMMYYYY → YYYYMMDD
    const reversed = e.slice(4, 8) + e.slice(2, 4) + e.slice(0, 2);
    if (reversed === sYYYYMMDD) return true;
  }
  return false;
}

interface IdentityCheck {
  status: "match" | "mismatch" | "unknown";
  reason: string;
  extracted: PatientIdentity;
}

/** Compare OCR-extracted identity with currently-opened patient. */
function checkIdentity(
  extracted: PatientIdentity | undefined,
  currentName?: string | null,
  currentDOB?: string | null,
  currentMRN?: string | null,
): IdentityCheck {
  if (!extracted || (!extracted.name && !extracted.dob && !extracted.mrn)) {
    return { status: "unknown", reason: "No identity block detected on report", extracted: extracted ?? {} };
  }

  // MRN is the strongest signal
  if (extracted.mrn && currentMRN) {
    const e = extracted.mrn.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const s = currentMRN.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (e && s) {
      if (e === s) return { status: "match", reason: `MRN match: ${extracted.mrn}`, extracted };
      return { status: "mismatch", reason: `MRN mismatch: report=${extracted.mrn} vs patient=${currentMRN}`, extracted };
    }
  }

  const nameSim = currentName ? nameSimilarity(extracted.name ?? "", currentName) : 0;
  const dobOk = dobMatches(extracted.dob, currentDOB);

  // Strong mismatch: both name and DOB present on report AND both fail
  if (extracted.name && currentName && nameSim < 0.34 && extracted.dob && currentDOB && !dobOk) {
    return {
      status: "mismatch",
      reason: `Name "${extracted.name}" and DOB "${extracted.dob}" don't match patient "${currentName}" / ${currentDOB}`,
      extracted,
    };
  }

  // Name strong mismatch alone (no DOB on report to confirm)
  if (extracted.name && currentName && nameSim < 0.2 && !extracted.dob) {
    return {
      status: "mismatch",
      reason: `Name "${extracted.name}" does not match patient "${currentName}"`,
      extracted,
    };
  }

  if (nameSim >= 0.5 || dobOk) {
    return { status: "match", reason: "Identity match", extracted };
  }

  return { status: "unknown", reason: "Identity could not be confirmed", extracted };
}

// NOTE: Lab values are stored AS-IS in the units of the patient's country.
// Country-specific reference profiles define the matching normal ranges, and
// the risk engine compares against those profiles — no conversion is applied.


function DateGroupValues({
  groupIndex,
  group,
  onValueChange,
  t,
  refMap,
  verifications,
  onToggleVerify,
}: {
  groupIndex: number;
  group: DateGroup;
  onValueChange: (key: string, value: string) => void;
  t: (key: string) => string;
  refMap: Record<string, { min: number | null; max: number | null; unit: string }>;
  verifications: Record<string, boolean>;
  onToggleVerify: (groupIndex: number, key: string, verified: boolean) => void;
}) {
  const filledFields = LAB_FIELDS.filter((f) => group.values[f.key] && group.values[f.key] !== "");
  const missingFields = LAB_FIELDS.filter((f) => !group.values[f.key] || group.values[f.key] === "");
  const lowConfFields = filledFields.filter(
    (f) => group.confidence[f.key] != null && group.confidence[f.key] < 80
  );
  const unknownUnitFields = filledFields.filter(
    (f) => (group.unitSources?.[f.key] ?? "unknown") === "unknown"
  );

  const requiresReview = (key: string): boolean => {
    const hasValue = group.values[key] && group.values[key] !== "";
    if (!hasValue) return false;
    const conf = group.confidence[key] ?? 100;
    const uSrc = group.unitSources?.[key] ?? "unknown";
    return conf < 80 || uSrc === "unknown";
  };

  return (
    <div className="space-y-3">
      {/* Detected / Missing summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <p className="text-[11px] uppercase font-semibold text-primary tracking-wide">Detected</p>
          <p className="text-lg font-bold text-primary">{filledFields.length}</p>
        </div>
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-2.5">
          <p className="text-[11px] uppercase font-semibold text-warning tracking-wide">Not detected</p>
          <p className="text-lg font-bold text-warning">{missingFields.length}</p>
        </div>
      </div>

      {(lowConfFields.length > 0 || unknownUnitFields.length > 0) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          {lowConfFields.length > 0 && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {lowConfFields.length} {t("upload.needsVerification")}
            </p>
          )}
          {unknownUnitFields.length > 0 && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {unknownUnitFields.length} field(s) with unknown unit — please verify before continuing
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LAB_FIELDS.map((field) => {
          const hasValue = group.values[field.key] && group.values[field.key] !== "";
          const conf = group.confidence[field.key] ?? 100;
          const isLowConf = hasValue && conf < 80;
          const origText = group.originalText[field.key];
          const uSrc = group.unitSources?.[field.key] ?? "unknown";
          const unknownUnit = hasValue && uSrc === "unknown";

          // Use country-specific unit if available
          const ref = refMap[field.key];
          const displayUnit = ref?.unit ?? field.unit;
          const refRange = ref ? `${ref.min ?? "—"}–${ref.max ?? "—"}` : null;

          // Check if value is outside reference range
          const numVal = hasValue ? parseFloat(group.values[field.key]) : NaN;
          const isOutOfRange = ref && !isNaN(numVal) && (
            (ref.min !== null && numVal < ref.min) || (ref.max !== null && numVal > ref.max)
          );
          const isSusp = !isNaN(numVal) && isSuspicious(field.key, numVal);

          const vKey = `${groupIndex}:${field.key}`;
          const isVerified = !!verifications[vKey];
          const reviewRequired = requiresReview(field.key);

          return (
            <div
              key={field.key}
              className={`space-y-1 rounded-lg border p-2.5 ${
                unknownUnit && !isVerified
                  ? "border-destructive bg-destructive/10 ring-2 ring-destructive/30"
                  : isSusp
                  ? "border-destructive bg-destructive/10 ring-2 ring-destructive/40"
                  : isLowConf && !isVerified
                  ? "border-destructive/40 bg-destructive/5 ring-1 ring-destructive/20"
                  : isOutOfRange
                  ? "border-warning/40 bg-warning/5"
                  : hasValue
                  ? "border-primary/30 bg-primary/5"
                  : "border-muted bg-muted/30"
              }`}
            >
              <Label className="text-xs flex items-center justify-between">
                <span className="flex items-center">
                  {field.label}
                  {hasValue && <ConfidenceBadge confidence={conf} />}
                </span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">{displayUnit}</Badge>
              </Label>
              {origText && origText !== group.values[field.key] && (
                <p className="text-[10px] text-muted-foreground truncate" title={origText}>
                  {t("upload.original")}: "{origText}"
                </p>
              )}
              <Input
                type="number"
                step="any"
                value={group.values[field.key] ?? ""}
                onChange={(e) => onValueChange(field.key, e.target.value)}
                className={`h-8 text-sm ${unknownUnit ? "border-destructive" : isSusp ? "border-destructive ring-1 ring-destructive" : isLowConf ? "border-destructive/40" : isOutOfRange ? "border-warning/40" : ""}`}
                placeholder={hasValue ? "—" : "Not detected — enter manually"}
              />
              {!hasValue && (
                <p className="text-[10px] text-warning font-medium">Not detected</p>
              )}
              {unknownUnit && (
                <p className="text-[10px] text-destructive font-semibold flex items-center gap-0.5">
                  <AlertTriangle className="h-3 w-3" /> Unit could not be determined. Please verify before continuing.
                </p>
              )}
              {isSusp && (
                <p className="text-[10px] text-destructive font-semibold flex items-center gap-0.5">
                  <AlertTriangle className="h-3 w-3" /> Suspicious value — please verify!
                </p>
              )}
              {refRange && (
                <p className={`text-[10px] ${isOutOfRange ? "text-warning font-medium" : "text-muted-foreground"}`}>
                  {isOutOfRange ? "⚠️ " : ""}Norma: {refRange} {displayUnit}
                </p>
              )}
              {hasValue && (
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={isVerified}
                    onChange={(e) => onToggleVerify(groupIndex, field.key, e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <span className={reviewRequired && !isVerified ? "text-destructive font-medium" : "text-muted-foreground"}>
                    {isVerified ? "✓ Reviewed" : reviewRequired ? "Review required" : "Reviewed"}
                  </span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LabUploadDialog({ patientId, organType, patientData, onLabAdded, patientCountry, patientName, patientDOB, patientMRN }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [saving, setSaving] = useState(false);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [reportType, setReportType] = useState<string>("");
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("0");
  const [country, setCountry] = useState<string>(patientCountry || "uzbekistan");
  /** Per-field verification flags keyed `${groupIndex}:${fieldKey}`. */
  const [verifications, setVerifications] = useState<Record<string, boolean>>({});
  /** Identity check + manual override state. */
  const [identityCheck, setIdentityCheck] = useState<IdentityCheck | null>(null);
  const [identityOverride, setIdentityOverride] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const processAbortRef = useRef<AbortController | null>(null);
  const processIdRef = useRef(0);
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: countries } = useLabCountries();
  const { data: refProfiles } = useLabReferenceProfiles(country, organType ?? null);

  useEffect(() => {
    return () => processAbortRef.current?.abort();
  }, []);

  /** Map test_name → reference profile for quick lookup */
  const refMap = useMemo(() => {
    const map: Record<string, { min: number | null; max: number | null; unit: string }> = {};
    refProfiles?.forEach((p) => {
      map[p.test_name] = { min: p.min_value, max: p.max_value, unit: p.unit };
    });
    return map;
  }, [refProfiles]);

  const reset = () => {
    processAbortRef.current?.abort();
    processAbortRef.current = null;
    setStep("upload");
    setDateGroups([]);
    setReportType("");
    setReportUrl(null);
    setSaving(false);
    setActiveTab("0");
    setVerifications({});
    setIdentityCheck(null);
    setIdentityOverride(false);
  };

  const cancelProcessing = () => {
    processAbortRef.current?.abort();
    processAbortRef.current = null;
    setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const MAX_FILES = 5;

  const isCancelledError = (error: unknown): boolean => {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    return error instanceof Error && error.name === "AbortError";
  };

  /**
   * Process a single file via the OCRCoordinator service.
   * All upload + AI + timeout + cleanup logic lives in the service now —
   * this dialog only orchestrates UI state.
   */
  const processSingleFile = async (
    file: File,
    fileIndex: number,
    totalFiles: number,
    controller: AbortController,
  ): Promise<{ groups: DateGroup[]; reportType: string; reportUrl: string | null }> => {
    console.log(`[LabUpload] processFile ${fileIndex + 1}/${totalFiles}`, {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    const result = await processFileOCR(file, {
      patientId,
      fileIndex,
      signal: controller.signal,
    });
    return {
      groups: result.groups as DateGroup[],
      reportType: result.reportType,
      reportUrl: result.reportUrl,
    };
  };

  /** Process one or more files (up to MAX_FILES) sequentially */
  const processFiles = async (files: File[]) => {
    processAbortRef.current?.abort();
    const controller = new AbortController();
    const processId = processIdRef.current + 1;
    processIdRef.current = processId;
    processAbortRef.current = controller;
    setStep("processing");
    const limited = files.slice(0, MAX_FILES);
    if (files.length > MAX_FILES) {
      toast({
        title: t("common.info"),
        description: `Faqat birinchi ${MAX_FILES} ta fayl qabul qilindi (${files.length} dan).`,
      });
    }

    const allGroups: DateGroup[] = [];
    let lastReportType = "";
    let lastReportUrl: string | null = null;
    const errors: string[] = [];

    for (let i = 0; i < limited.length; i++) {
      try {
        if (controller.signal.aborted) break;
        toast({ title: `📄 ${i + 1}/${limited.length}`, description: limited[i].name });
        const { groups, reportType: rt, reportUrl: ru } = await processSingleFile(limited[i], i, limited.length, controller);
        allGroups.push(...groups);
        if (rt) lastReportType = rt;
        if (ru) lastReportUrl = ru;
      } catch (err: unknown) {
        if (isCancelledError(err)) break;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[LabUpload] File ${i + 1} failed:`, err);
        errors.push(message);
      }
    }

    try {
      if (controller.signal.aborted) return;
      if (allGroups.length === 0) {
        toast({
          title: t("common.error"),
          description: errors.length > 0 ? errors.join(" | ") : "No values extracted from any file.",
          variant: "destructive",
        });
        return;
      }

      setDateGroups(allGroups);
      setReportType(lastReportType);
      setReportUrl(lastReportUrl);
      setVerifications({});
      setIdentityOverride(false);

      // ── Patient identity safety check (uses first group's identity) ──
      const firstWithIdentity = allGroups.find((g) => g.patientIdentity);
      const idCheck = checkIdentity(
        firstWithIdentity?.patientIdentity,
        patientName,
        patientDOB,
        patientMRN,
      );
      setIdentityCheck(idCheck);
      if (idCheck.status === "mismatch") {
        toast({
          title: "⚠ Patient identity mismatch",
          description: "This report may belong to another patient. Please verify before continuing.",
          variant: "destructive",
        });
      }

      for (const g of allGroups) {
        const detected = detectCountryFromUnits(g);
        if (detected) {
          setCountry(detected.country);
          toast({ title: "🌍 " + t("common.info"), description: detected.reason });
          break;
        }
      }

      const totalLowConf = allGroups.reduce((sum, g) => {
        return sum + LAB_FIELDS.filter(
          (f) => g.values[f.key] && g.confidence[f.key] != null && g.confidence[f.key] < 80
        ).length;
      }, 0);

      if (totalLowConf > 0) {
        toast({
          title: `${totalLowConf} ${t("upload.verifyValues")}`,
          description: t("upload.lowConfidenceDesc"),
          variant: "destructive",
        });
      }

      if (errors.length > 0) {
        toast({
          title: `⚠ ${errors.length} fayl ishlanmadi`,
          description: errors.join(" | "),
          variant: "destructive",
        });
      }

      toast({ title: `✓ ${limited.length - errors.length}/${limited.length} fayl, ${allGroups.length} sana topildi` });
      setStep("confirm");
    } finally {
      if (processIdRef.current === processId) {
        processAbortRef.current = null;
        setStep((current) => (current === "processing" ? "upload" : current));
      }
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
      console.log("[LabUpload] processFiles end");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) processFiles(files);
  };

  const updateGroupValue = (groupIndex: number, key: string, value: string) => {
    setDateGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, values: { ...g.values, [key]: value } } : g
      )
    );
  };

  const updateGroupDate = (groupIndex: number, newDate: string) => {
    setDateGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, date: newDate } : g
      )
    );
  };

  /**
   * Verification completeness across all visible groups.
   * Save button is enabled only when every required-review field is checked off.
   */
  const verificationStatus = useMemo(() => {
    let detected = 0;
    let reviewed = 0;
    let requiredOpen = 0;
    dateGroups.forEach((g, gi) => {
      LAB_FIELDS.forEach((f) => {
        const has = g.values[f.key] && g.values[f.key] !== "";
        if (!has) return;
        detected++;
        const conf = g.confidence[f.key] ?? 100;
        const uSrc = g.unitSources?.[f.key] ?? "unknown";
        const required = conf < 80 || uSrc === "unknown";
        const verified = !!verifications[`${gi}:${f.key}`];
        if (verified) reviewed++;
        if (required && !verified) requiredOpen++;
      });
    });
    return { detected, reviewed, requiredOpen, ready: requiredOpen === 0 };
  }, [dateGroups, verifications]);

  const handleConfirm = async () => {
    // ── Patient identity gate ──
    if (identityCheck?.status === "mismatch" && !identityOverride) {
      toast({
        title: "Blocked: identity mismatch",
        description: "This report may belong to another patient. Please confirm override before saving.",
        variant: "destructive",
      });
      return;
    }
    // ── Verification completeness gate ──
    if (!verificationStatus.ready) {
      toast({
        title: "Verification incomplete",
        description: `${verificationStatus.requiredOpen} field(s) still require review before saving.`,
        variant: "destructive",
      });
      return;
    }
    // ── Audit log for identity override ──
    if (identityCheck?.status === "mismatch" && identityOverride) {
      void logAudit({
        action: "patient_identity_override",
        entityType: "patient",
        entityId: patientId,
        metadata: {
          reason: identityCheck.reason,
          extracted: identityCheck.extracted,
          stored_name: patientName ?? null,
          stored_dob: patientDOB ?? null,
        },
      });
    }
    // ── Audit log for unknown-unit confirmations ──
    dateGroups.forEach((g, gi) => {
      LAB_FIELDS.forEach((f) => {
        const has = g.values[f.key] && g.values[f.key] !== "";
        if (!has) return;
        const uSrc = g.unitSources?.[f.key] ?? "unknown";
        if (uSrc === "unknown" && verifications[`${gi}:${f.key}`]) {
          void logAudit({
            action: "ocr_unknown_unit_confirmed",
            entityType: "patient",
            entityId: patientId,
            metadata: { field: f.key, value: g.values[f.key], date: g.date },
          });
        }
      });
    });

    setSaving(true);
    try {
      // --- Date unification: merge groups with the same date ---
      const mergedMap = new Map<string, DateGroup>();
      for (const group of dateGroups) {
        const key = group.date || "unknown";
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key)!;
          // Merge values: prefer non-empty values, keep higher confidence
          for (const field of LAB_FIELDS) {
            const newVal = group.values[field.key];
            const existingVal = existing.values[field.key];
            if (newVal && newVal !== "" && (!existingVal || existingVal === "")) {
              existing.values[field.key] = newVal;
              existing.confidence[field.key] = group.confidence[field.key] ?? 100;
              existing.originalText[field.key] = group.originalText[field.key] ?? "";
            } else if (newVal && newVal !== "" && existingVal && existingVal !== "") {
              // Both have values - keep the one with higher confidence
              const newConf = group.confidence[field.key] ?? 100;
              const existingConf = existing.confidence[field.key] ?? 100;
              if (newConf > existingConf) {
                existing.values[field.key] = newVal;
                existing.confidence[field.key] = newConf;
                existing.originalText[field.key] = group.originalText[field.key] ?? "";
              }
            }
          }
        } else {
          mergedMap.set(key, { ...group, values: { ...group.values }, confidence: { ...group.confidence }, originalText: { ...group.originalText } });
        }
      }
      const mergedGroups = Array.from(mergedMap.values());

      // ── HARD BLOCK VALIDATION ─────────────────────────────────────────
      // Only impossible values stop saving: future dates, pre-transplant dates,
      // malformed numbers, negative lab values. Unusual-but-possible values
      // pass and are surfaced as soft warnings in the UI.
      const blockingErrors: string[] = [];
      for (const group of mergedGroups) {
        const dateCheck = validateLabDate(
          group.date === "unknown" ? null : group.date,
          patientData?.transplant_date ?? null
        );
        if (!dateCheck.ok && dateCheck.error) {
          blockingErrors.push(`${group.date}: ${dateCheck.error}`);
        }
        for (const field of LAB_FIELDS) {
          const raw = group.values[field.key];
          if (raw === undefined || raw === null || raw === "") continue;
          const n = parseFloat(raw);
          if (Number.isNaN(n)) {
            blockingErrors.push(`${field.label}: "${raw}" — raqam emas`);
            continue;
          }
          if (n < 0) {
            blockingErrors.push(`${field.label}: ${n} — manfiy qiymat saqlanmaydi`);
          }
        }
      }
      if (blockingErrors.length > 0) {
        toast({
          title: t("common.error"),
          description: `Tekshiring va to'g'rilang:\n• ${blockingErrors.slice(0, 6).join("\n• ")}${blockingErrors.length > 6 ? `\n+${blockingErrors.length - 6} ...` : ""}`,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      let totalFilled = 0;

      // Sort merged groups by date ascending so risk calculation gets correct prevLab
      const sortedGroups = [...mergedGroups].sort((a, b) => {
        if (a.date === "unknown") return -1;
        if (b.date === "unknown") return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      // Track up to 4 previous labs so each new result is scored against a 5-test rolling window
      let historicalWindow: any[] = [];

      try {
        const existingLabs = await fetchLabsByPatientId(patientId, 4);
        historicalWindow = existingLabs.slice(0, 4);
      } catch { /* ignore */ }

      for (const group of sortedGroups) {
        const labData: Record<string, any> = { patient_id: patientId };
        if (reportUrl) labData.report_file_url = reportUrl;

        if (group.date && group.date !== "unknown") {
          labData.recorded_at = new Date(group.date).toISOString();
        }

        let filledCount = 0;
        // Save raw values AS-IS in country-specific units. Reference profiles
        // (per country) define the matching normal ranges; risk engine compares
        // values against the country profile, so no conversion is performed here.
        // Sprint A: also accumulate provenance per field (unit, unit_source, etc.).
        const provenanceForGroup: Array<Omit<ProvenanceRow, "lab_result_id">> = [];
        for (const field of LAB_FIELDS) {
          const raw = group.values[field.key];
          const v = parseFloat(raw);
          if (isNaN(v)) { labData[field.key] = null; continue; }
          const printedUnit = group.units?.[field.key] ?? "";
          const conv = convertByPrintedUnit(
            field.key as CanonicalLabKey,
            v,
            printedUnit && printedUnit.trim() !== "" ? printedUnit : null,
            { fieldLabel: field.label, patientId },
          );
          labData[field.key] = v; // stored AS-IS per existing contract
          filledCount++;
          provenanceForGroup.push({
            patient_id: patientId,
            field_key: field.key,
            original_text: group.originalText?.[field.key] ?? null,
            raw_value: v,
            normalized_value: conv.value,
            detected_unit: printedUnit || null,
            unit_source: group.unitSources?.[field.key] ?? conv.unitSource,
            confidence: group.confidence?.[field.key] ?? null,
            extraction_source: reportType === "deterministic" ? "deterministic-pdf" : "ai-image",
            conversion_applied: conv.conversion,
            verification_status: "unverified",
          });
        }

        if (filledCount > 0) {
          let savedLab;
          try {
            console.info("[LabUpload] upsertLabResult payload", {
              patient_id: labData.patient_id,
              recorded_at: labData.recorded_at,
              filledCount,
              keys: Object.keys(labData).filter((k) => labData[k] != null),
            });
            savedLab = await upsertLabResult(labData as Record<string, any> & { patient_id: string });
            console.info("[LabUpload] upsertLabResult success", { id: savedLab?.id });
          } catch (insertErr: any) {
            console.error("[LabUpload] upsertLabResult FAILED", {
              message: insertErr?.message,
              code: insertErr?.code,
              details: insertErr?.details,
              hint: insertErr?.hint,
              status: insertErr?.status,
              full: insertErr,
            });
            throw insertErr;
          }
          totalFilled += filledCount;

          // Persist provenance rows (best-effort, never blocks save).
          if (savedLab?.id) {
            void insertProvenanceRows(
              provenanceForGroup.map((p) => ({ ...p, lab_result_id: savedLab.id })),
            );
          }

          // --- Compute risk score for each saved lab ---
          if (organType) {
            try {
               const { score, level, flags, explanations } = await computeRiskScoreAsync(
                 organType, savedLab as any, { ...patientData, transplant_date: undefined }, historicalWindow
               );

              const snapshot = await insertRiskSnapshot({
                patient_id: patientId,
                lab_result_id: savedLab.id,
                score,
                risk_level: level,
                creatinine: labData.creatinine ?? null,
                alt: labData.alt ?? null,
                ast: labData.ast ?? null,
                total_bilirubin: labData.total_bilirubin ?? null,
                tacrolimus_level: labData.tacrolimus_level ?? null,
                details: { flags, explanations },
              });

              // Create alert if risk is high or medium
              if (level === "high") {
                await insertPatientAlert({
                  patient_id: patientId,
                  risk_snapshot_id: snapshot?.id ?? null,
                  severity: "critical",
                  title: `${t("risk.highDetected")} (${score})`,
                  message: flags.join("; "),
                });
              } else if (level === "medium") {
                await insertPatientAlert({
                  patient_id: patientId,
                  risk_snapshot_id: snapshot?.id ?? null,
                  severity: "warning",
                  title: `${t("risk.mediumDetected")} (${score})`,
                  message: flags.join("; "),
                });
              }
            } catch (riskErr) {
              console.error("Risk calculation error:", riskErr);
            }
          }

          // Update rolling history for next iteration
          historicalWindow = [savedLab, ...historicalWindow.filter((lab) => lab.id !== savedLab.id)].slice(0, 4);
        }
      }

      if (totalFilled === 0) {
        toast({ title: t("common.error"), description: t("upload.noValuesExtracted") || "No lab values were extracted from the file. Please try a clearer image or enter values manually.", variant: "destructive" });
        setSaving(false);
        return;
      }

      await insertEvent({ patient_id: patientId, event_type: "lab_uploaded", description: `${t("upload.labUploadedEvent")} (${mergedGroups.length})` });
      logAudit({ action: "lab_upload", entityType: "patient", entityId: patientId, metadata: { dateCount: mergedGroups.length, totalFilled } });
      
      toast({ title: `${mergedGroups.length} ${t("upload.resultsSaved")}` });
      reset();
      setOpen(false);
      onLabAdded();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> {t("upload.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {step === "upload" && t("upload.uploadTitle")}
            {step === "processing" && t("upload.processing")}
            {step === "confirm" && t("upload.confirm")}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("upload.description")}
            </p>

            {/* Country selector */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-8 text-sm border-0 bg-transparent shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(countries ?? ["uzbekistan", "india"]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {COUNTRY_LABELS[c] ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {country === "uzbekistan" ? "µmol/L" : "mg/dL"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-3 border-dashed border-2"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-primary" />
                <span className="font-medium">{t("upload.takePhoto")}</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex-col gap-3 border-dashed border-2"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-primary" />
                <span className="font-medium">{t("upload.uploadFile")}</span>
                <span className="text-[10px] text-muted-foreground">1–5 ta fayl tanlang</span>
              </Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/jpeg,image/jpg,image/png" capture="environment" className="hidden" onChange={handleFileChange} />
            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/jpg,image/png,application/pdf,.txt,.csv,.tsv,.docx,.xlsx,.xls,.doc,text/plain,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/msword" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{t("upload.aiProcessing")}</p>
            <p className="text-xs text-muted-foreground">{t("upload.detectingDates")}</p>
            <Button type="button" variant="outline" size="sm" onClick={cancelProcessing}>
              {t("common.cancel")}
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            {/* ── Patient identity safety banner ── */}
            {identityCheck && identityCheck.status === "mismatch" && (
              <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive">
                      This report may belong to another patient. Please verify before continuing.
                    </p>
                    <p className="text-xs text-destructive/80 mt-1">{identityCheck.reason}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Report: <strong>{identityCheck.extracted.name ?? "—"}</strong>
                      {identityCheck.extracted.dob ? ` · DOB ${identityCheck.extracted.dob}` : ""}
                      {identityCheck.extracted.mrn ? ` · MRN ${identityCheck.extracted.mrn}` : ""}
                      <br />
                      Patient: <strong>{patientName ?? "—"}</strong>
                      {patientDOB ? ` · DOB ${patientDOB}` : ""}
                      {patientMRN ? ` · MRN ${patientMRN}` : ""}
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={identityOverride}
                    onChange={(e) => setIdentityOverride(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="font-medium text-destructive">
                    I have verified this report belongs to the current patient (override will be audited).
                  </span>
                </label>
              </div>
            )}
            {identityCheck && identityCheck.status === "match" && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 flex items-center gap-2 text-xs text-primary">
                <CheckCircle2 className="h-4 w-4" /> Identity match: {identityCheck.reason}
              </div>
            )}

            {/* ── Verification completeness summary ── */}
            <div className={`rounded-lg border p-2 text-xs flex items-center justify-between ${verificationStatus.ready ? "border-primary/30 bg-primary/5 text-primary" : "border-warning/40 bg-warning/5 text-warning"}`}>
              <span>
                Detected: <strong>{verificationStatus.detected}</strong> · Reviewed: <strong>{verificationStatus.reviewed}</strong>
              </span>
              <span className="font-semibold">
                {verificationStatus.ready ? "Ready" : `Verification incomplete (${verificationStatus.requiredOpen} required)`}
              </span>
            </div>

            {dateGroups.length > 1 && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  {dateGroups.length} {t("upload.datesDetected")}
                </span>
              </div>
            )}


            {dateGroups.length > 1 ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                  {dateGroups.map((group, i) => {
                    const filled = LAB_FIELDS.filter((f) => group.values[f.key] && group.values[f.key] !== "").length;
                    return (
                      <TabsTrigger key={i} value={String(i)} className="gap-1.5 text-xs">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateLocalized(group.date, t)}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {filled}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                {dateGroups.map((group, i) => (
                  <TabsContent key={i} value={String(i)} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">{t("upload.dateLabel")}</Label>
                      <Input
                        type="date"
                        value={group.date === "unknown" ? "" : group.date}
                        onChange={(e) => updateGroupDate(i, e.target.value)}
                        className="h-8 w-48 text-sm"
                      />
                      {group.date === "unknown" && (
                        <span className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {t("upload.enterDateManually")}
                        </span>
                      )}
                    </div>
                    <DateGroupValues
                      groupIndex={i}
                      group={group}
                      onValueChange={(key, value) => updateGroupValue(i, key, value)}
                      t={t}
                      refMap={refMap}
                      verifications={verifications}
                      onToggleVerify={(gi, k, v) =>
                        setVerifications((prev) => ({ ...prev, [`${gi}:${k}`]: v }))
                      }
                    />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <>
                {dateGroups[0]?.date !== "unknown" && (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm">{t("upload.dateLabel")} {formatDateLocalized(dateGroups[0]?.date, t)}</span>
                    <Input
                      type="date"
                      value={dateGroups[0]?.date === "unknown" ? "" : dateGroups[0]?.date}
                      onChange={(e) => updateGroupDate(0, e.target.value)}
                      className="h-7 w-40 text-xs ml-auto"
                    />
                  </div>
                )}
                {dateGroups[0]?.date === "unknown" && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">{t("upload.dateNotDetectedDesc")}</span>
                    <Input
                      type="date"
                      value=""
                      onChange={(e) => updateGroupDate(0, e.target.value)}
                      className="h-7 w-40 text-xs ml-auto"
                    />
                  </div>
                )}
                {dateGroups[0] && (
                  <DateGroupValues
                    groupIndex={0}
                    group={dateGroups[0]}
                    onValueChange={(key, value) => updateGroupValue(0, key, value)}
                    t={t}
                    refMap={refMap}
                    verifications={verifications}
                    onToggleVerify={(gi, k, v) =>
                      setVerifications((prev) => ({ ...prev, [`${gi}:${k}`]: v }))
                    }
                  />
                )}
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleConfirm}
                disabled={saving || !verificationStatus.ready || (identityCheck?.status === "mismatch" && !identityOverride)}
                className="flex-1 gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {dateGroups.length > 1
                  ? `${dateGroups.length} ${t("upload.saveResults")}`
                  : t("upload.confirmResults")}
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-2">
                <Edit3 className="h-4 w-4" /> {t("upload.reupload")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
