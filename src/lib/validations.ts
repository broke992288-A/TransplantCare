import { z } from "zod";

// ── Patient Creation ────────────────────────────────
export const patientSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Исм камида 2 та белгидан иборат бўлиши керак")
    .max(100, "Исм 100 та белгидан ошмаслиги керак"),
  date_of_birth: z
    .string()
    .min(1, "Туғилган сана киритилиши шарт"),
  gender: z.enum(["male", "female"], {
    required_error: "Жинс танланиши шарт",
  }),
  region: z
    .string()
    .min(1, "Вилоят танланиши шарт"),
  district: z
    .string()
    .min(1, "Туман танланиши шарт"),
  transplant_number: z.coerce
    .number()
    .int()
    .min(1, "Трансплантация рақами камида 1 бўлиши керак")
    .max(10, "Трансплантация рақами 10 дан ошмаслиги керак"),
  transplant_date: z
    .string()
    .min(1, "Трансплантация санаси киритилиши шарт"),
  rejection_type: z.string().optional(),
  dialysis_history: z.enum(["yes", "no"]).optional(),
  return_dialysis_date: z.string().optional(),
  biopsy_result: z.string().max(500, "Биопсия натижаси 500 та белгидан ошмаслиги керак").optional(),
});

// ── Lab Results (Liver) ─────────────────────────────
// HARD BLOCK = only physiologically impossible values (negatives, malformed,
// or beyond absolute limits). Unusual-but-possible values pass here and are
// surfaced as SOFT WARNINGS via utils/labValidation.ts.
const labNum = (label: string, max: number) =>
  z.coerce
    .number({ invalid_type_error: `${label} — raqam kiriting` })
    .refine((v) => !Number.isNaN(v), { message: `${label} — noto'g'ri raqam` })
    .min(0, `${label} manfiy bo'lishi mumkin emas`)
    .max(max, `${label} — fiziologik jihatdan imkonsiz qiymat`);

export const liverLabSchema = z.object({
  tacrolimus_level: labNum("Tacrolimus", 100),
  alt: labNum("ALT", 10000),
  ast: labNum("AST", 10000),
  total_bilirubin: labNum("Umumiy bilirubin", 50),
  direct_bilirubin: labNum("To'g'ridan-to'g'ri bilirubin", 30),
});

// ── Lab Results (Kidney) ────────────────────────────
export const kidneyLabSchema = z.object({
  creatinine: labNum("Kreatinin", 30),
  egfr: z.union([
    z.literal("").transform(() => undefined),
    labNum("eGFR", 250),
  ]).optional(),
  proteinuria: labNum("Proteinuriya", 30),
  potassium: labNum("Kaliy", 15),
});

// ── Lab Date Validation ─────────────────────────────
/**
 * Validate a lab recorded_at date.
 * HARD BLOCK: future dates, dates before patient's transplant date, malformed dates.
 * Empty/missing dates pass (caller decides whether to require).
 */
export function validateLabDate(
  dateStr: string | null | undefined,
  transplantDate?: string | null
): { ok: boolean; error?: string } {
  if (!dateStr) return { ok: true };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { ok: false, error: "Lab sanasi noto'g'ri formatda" };
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (d.getTime() > endOfToday.getTime()) {
    return { ok: false, error: "Lab sanasi kelajakda bo'lishi mumkin emas" };
  }
  if (transplantDate) {
    const tx = new Date(transplantDate);
    if (!isNaN(tx.getTime())) {
      // Strip time on transplant date for fair comparison
      tx.setHours(0, 0, 0, 0);
      if (d.getTime() < tx.getTime()) {
        return {
          ok: false,
          error: "Lab sanasi transplantatsiya sanasidan oldin bo'lishi mumkin emas",
        };
      }
    }
  }
  return { ok: true };
}

// ── Medication ──────────────────────────────────────
export const medicationSchema = z.object({
  medication_name: z
    .string()
    .trim()
    .min(2, "Дори номи камида 2 та белгидан иборат бўлиши керак")
    .max(100, "Дори номи 100 та белгидан ошмаслиги керак"),
  dosage: z
    .string()
    .trim()
    .min(1, "Доза киритилиши шарт")
    .max(50, "Доза 50 та белгидан ошмаслиги керак"),
  frequency: z.enum(["daily", "twice_daily", "three_times", "weekly", "as_needed"], {
    required_error: "Частота танланиши шарт",
  }),
  start_date: z.string().min(1, "Бошланиш санаси киритилиши шарт"),
  notes: z.string().max(500, "Изоҳ 500 та белгидан ошмаслиги керак").optional(),
});

// ── Types ───────────────────────────────────────────
export type PatientFormData = z.infer<typeof patientSchema>;
export type LiverLabFormData = z.infer<typeof liverLabSchema>;
export type KidneyLabFormData = z.infer<typeof kidneyLabSchema>;
export type MedicationFormData = z.infer<typeof medicationSchema>;
