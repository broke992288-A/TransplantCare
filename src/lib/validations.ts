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
  gender: z.enum(["male", "female", "other"], {
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
export const liverLabSchema = z.object({
  tacrolimus_level: z.coerce
    .number({ invalid_type_error: "Рақам киритинг" })
    .min(0.1, "Tacrolimus камида 0.1 бўлиши керак")
    .max(50, "Tacrolimus 50 дан ошмаслиги керак"),
  alt: z.coerce
    .number({ invalid_type_error: "Рақам киритинг" })
    .min(0, "ALT манфий бўлиши мумкин эмас")
    .max(5000, "ALT 5000 дан ошмаслиги керак"),
  ast: z.coerce
    .number({ invalid_type_error: "Рақам киритинг" })
    .min(0, "AST манфий бўлиши мумкин эмас")
    .max(5000, "AST 5000 дан ошмаслиги керак"),
  total_bilirubin: z.coerce
    .number({ invalid_type_error: "Рақам киритинг" })
    .min(0, "Умумий билирубин манфий бўлиши мумкин эмас")
    .max(50, "Умумий билирубин 50 дан ошмаслиги керак"),
  direct_bilirubin: z.coerce
    .number({ invalid_type_error: "Рақам киритинг" })
    .min(0, "Тўғридан-тўғри билирубин манфий бўлиши мумкин эмас")
    .max(30, "Тўғридан-тўғри билирубин 30 дан ошмаслиги керак"),
});

// ── Lab Results (Kidney) ────────────────────────────
export const kidneyLabSchema = z.object({
  creatinine: z.coerce
    .number({ invalid_type_error: "Рақам киритинг" })
    .min(0.1, "Креатинин камида 0.1 бўлиши керак")
    .max(30, "Креатинин 30 дан ошмаслиги керак"),
  egfr: z.union([
    z.literal("").transform(() => undefined),
    z.coerce
      .number({ invalid_type_error: "Рақам киритинг" })
      .min(0, "eGFR манфий бўлиши мумкин эмас")
      .max(200, "eGFR 200 дан ошмаслиги керак"),
  ]).optional(),
  proteinuria: z.coerce
    .number({ invalid_type_error: "Рақам киритинг" })
    .min(0, "Протеинурия манфий бўлиши мумкин эмас")
    .max(20, "Протеинурия 20 дан ошмаслиги керак"),
  potassium: z.coerce
    .number({ invalid_type_error: "Рақам киритинг" })
    .min(1, "Калий камида 1 бўлиши керак")
    .max(10, "Калий 10 дан ошмаслиги керак"),
});

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
