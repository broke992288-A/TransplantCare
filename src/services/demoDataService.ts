import { supabase } from "@/integrations/supabase/client";

const UZBEK_NAMES_MALE = [
  "Abdulloh", "Bobur", "Doniyor", "Elmurod", "Farrux", "G'ayrat", "Husan", "Islom", "Jasur",
  "Kamol", "Laziz", "Mirzo", "Nodir", "Otabek", "Parviz", "Rustam", "Sanjar", "Temur",
  "Ulug'bek", "Vohid", "Xurshid", "Yorqin", "Zafar", "Sardor", "Sherzod", "Behruz",
];
const UZBEK_NAMES_FEMALE = [
  "Aziza", "Barno", "Dilnoza", "Feruza", "Gulnora", "Hilola", "Iroda", "Kamola",
  "Lobar", "Malika", "Nafisa", "Oygul", "Parizod", "Sabohat", "Tabassum", "Zulfiya",
];
const SURNAMES = [
  "Karimov", "Rahimov", "Toshmatov", "Xolmatov", "Ergashev", "Mirzayev", "Umarov",
  "Yusupov", "Abdullayev", "Botirov", "Sultonov", "Qodirov", "Nazarov", "Ismoilov",
];
const REGIONS = [
  "Toshkent shahri", "Toshkent viloyati", "Samarqand viloyati", "Buxoro viloyati",
  "Farg'ona viloyati", "Andijon viloyati", "Namangan viloyati", "Qashqadaryo viloyati",
  "Surxondaryo viloyati", "Xorazm viloyati", "Navoiy viloyati", "Jizzax viloyati",
];
const MEDICATIONS = [
  { name: "Tacrolimus", dosages: ["0.5 mg", "1 mg", "2 mg", "5 mg"] },
  { name: "Mycophenolate", dosages: ["250 mg", "500 mg", "1000 mg"] },
  { name: "Prednisolone", dosages: ["5 mg", "10 mg", "20 mg"] },
  { name: "Cyclosporine", dosages: ["25 mg", "50 mg", "100 mg"] },
  { name: "Azathioprine", dosages: ["50 mg", "75 mg", "100 mg"] },
  { name: "Sirolimus", dosages: ["1 mg", "2 mg"] },
  { name: "Valganciclovir", dosages: ["450 mg", "900 mg"] },
  { name: "Cotrimoxazole", dosages: ["480 mg", "960 mg"] },
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randNum(min: number, max: number, decimals = 1): number {
  return parseFloat((min + Math.random() * (max - min)).toFixed(decimals));
}
function randDate(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString().slice(0, 10);
}

export interface DemoProgress {
  step: string;
  current: number;
  total: number;
}

export async function generateDemoData(
  doctorId: string,
  onProgress?: (p: DemoProgress) => void
): Promise<{ patients: number; labs: number; alerts: number; medications: number }> {
  const patientCount = 50;
  const labsPerPatient = 4; // ~200 total
  const alertCount = 20;
  const medsPerPatient = 2; // ~100 total

  const patientIds: string[] = [];

  // 1. Create patients
  for (let i = 0; i < patientCount; i++) {
    onProgress?.({ step: "patients", current: i + 1, total: patientCount });
    const isMale = Math.random() > 0.4;
    const name = isMale ? rand(UZBEK_NAMES_MALE) : rand(UZBEK_NAMES_FEMALE);
    const surname = rand(SURNAMES);
    const organ = Math.random() > 0.4 ? "kidney" : "liver";
    const risk = Math.random() < 0.15 ? "high" : Math.random() < 0.4 ? "medium" : "low";

    const { data, error } = await supabase
      .from("patients")
      .insert({
        full_name: `${name} ${isMale ? surname : surname + "a"}`,
        date_of_birth: randDate(1950, 2005),
        gender: isMale ? "male" : "female",
        organ_type: organ,
        risk_level: risk,
        assigned_doctor_id: doctorId,
        transplant_number: Math.random() > 0.8 ? 2 : 1,
        transplant_date: randDate(2018, 2026),
        dialysis_history: organ === "kidney" ? Math.random() > 0.6 : false,
        region: rand(REGIONS),
      })
      .select("id")
      .single();

    if (error) throw new Error(`Patient ${i}: ${error.message}`);
    patientIds.push(data.id);
  }

  // 2. Create lab results
  let labCount = 0;
  for (let i = 0; i < patientIds.length; i++) {
    onProgress?.({ step: "labs", current: i + 1, total: patientIds.length });
    const pid = patientIds[i];
    // determine organ
    const isKidney = i % 5 !== 0; // roughly 80% kidney

    for (let j = 0; j < labsPerPatient; j++) {
      const recorded = new Date();
      recorded.setDate(recorded.getDate() - (j * 30 + Math.floor(Math.random() * 10)));

      const labData: Record<string, any> = {
        patient_id: pid,
        recorded_at: recorded.toISOString(),
      };

      if (isKidney) {
        labData.creatinine = randNum(0.8, 4.0);
        labData.egfr = randNum(15, 120, 0);
        labData.potassium = randNum(3.0, 6.5);
        labData.proteinuria = randNum(0, 3.0);
        labData.sodium = randNum(130, 150, 0);
        labData.hb = randNum(8, 16);
      } else {
        labData.tacrolimus_level = randNum(2, 25);
        labData.alt = randNum(10, 300, 0);
        labData.ast = randNum(10, 250, 0);
        labData.total_bilirubin = randNum(0.2, 8);
        labData.direct_bilirubin = randNum(0.1, 4);
        labData.albumin = randNum(2.5, 5.0);
      }

      const { error } = await supabase.from("lab_results").insert(labData as any);
      if (!error) labCount++;
    }
  }

  // 3. Alerts — the DB trigger `trg_check_lab_abnormal` already creates some.
  // Add supplementary alerts.
  let alertsCreated = 0;
  const alertTypes = ["risk", "medication", "lab_abnormal", "follow_up"];
  const severities = ["critical", "warning", "info"];
  const titles = [
    "Yuqori xavf aniqlandi", "Dori dozasi tekshirilsin", "Laboratoriya og'ishi",
    "Nazorat tekshiruvi kerak", "Rejektsiya ehtimoli", "Tacrolimus norma tashqarida",
  ];

  for (let i = 0; i < Math.min(alertCount, patientIds.length); i++) {
    onProgress?.({ step: "alerts", current: i + 1, total: alertCount });
    const { error } = await supabase.from("patient_alerts").insert({
      patient_id: patientIds[i % patientIds.length],
      alert_type: rand(alertTypes),
      severity: rand(severities),
      title: rand(titles),
      message: "Demo alert — avtomatik yaratilgan",
      is_read: Math.random() > 0.7,
    });
    if (!error) alertsCreated++;
  }

  // 4. Medications
  let medsCreated = 0;
  for (let i = 0; i < patientIds.length; i++) {
    onProgress?.({ step: "medications", current: i + 1, total: patientIds.length });
    for (let m = 0; m < medsPerPatient; m++) {
      const med = rand(MEDICATIONS);
      const { error } = await supabase.from("medications").insert({
        patient_id: patientIds[i],
        medication_name: med.name,
        dosage: rand(med.dosages),
        frequency: rand(["daily", "twice_daily", "three_times"]),
        start_date: randDate(2023, 2026),
        prescribed_by: doctorId,
        is_active: Math.random() > 0.2,
      });
      if (!error) medsCreated++;
    }
  }

  return { patients: patientIds.length, labs: labCount, alerts: alertsCreated, medications: medsCreated };
}
