/**
 * Standard transplant medication catalog with groups, brand names, and dosages.
 * Based on Uzbekistan national transplant medication distribution data.
 */

export interface MedicationEntry {
  name: string;
  genericName: string;
  dosages: string[];
}

export interface MedicationGroup {
  groupKey: string;
  medications: MedicationEntry[];
}

export const MEDICATION_GROUPS: MedicationGroup[] = [
  {
    groupKey: "cni",
    medications: [
      { name: "Prograf", genericName: "Tacrolimus", dosages: ["0.5 mg", "1 mg", "2 mg", "5 mg"] },
      { name: "Pangraf", genericName: "Tacrolimus", dosages: ["0.5 mg", "1 mg"] },
      { name: "Sandimmun Neoral", genericName: "Cyclosporine", dosages: ["25 mg", "50 mg", "100 mg"] },
    ],
  },
  {
    groupKey: "antimetabolite",
    medications: [
      { name: "CellCept", genericName: "Mycophenolate mofetil (MMF)", dosages: ["250 mg", "500 mg"] },
      { name: "Myfortic", genericName: "Mycophenolic acid (MPA)", dosages: ["180 mg", "360 mg"] },
    ],
  },
  {
    groupKey: "mtor",
    medications: [
      { name: "Certican", genericName: "Everolimus", dosages: ["0.25 mg", "0.5 mg", "0.75 mg", "1 mg"] },
      { name: "Rapamune", genericName: "Sirolimus", dosages: ["0.5 mg", "1 mg", "2 mg"] },
    ],
  },
  {
    groupKey: "corticosteroid",
    medications: [
      { name: "Prednisolone", genericName: "Prednisolone", dosages: ["5 mg", "10 mg", "20 mg"] },
      { name: "Methylprednisolone", genericName: "Methylprednisolone", dosages: ["4 mg", "8 mg", "16 mg", "500 mg", "1000 mg"] },
    ],
  },
  {
    groupKey: "other",
    medications: [
      { name: "Valganciclovir", genericName: "Valganciclovir", dosages: ["450 mg"] },
      { name: "Cotrimoxazole", genericName: "Trimethoprim/Sulfamethoxazole", dosages: ["480 mg", "960 mg"] },
    ],
  },
];

/** Flat list of all medication names */
export const ALL_MEDICATION_NAMES = MEDICATION_GROUPS.flatMap(g =>
  g.medications.map(m => m.name)
);

/** Find group key for a medication name (case-insensitive) */
export function getMedicationGroup(medicationName: string): string {
  const lower = medicationName.toLowerCase().trim();
  for (const group of MEDICATION_GROUPS) {
    for (const med of group.medications) {
      if (med.name.toLowerCase() === lower || med.genericName.toLowerCase().includes(lower)) {
        return group.groupKey;
      }
    }
  }
  // Heuristic matching
  if (/tacrolimus|prograf|pangraf|advagraf|envarsus/i.test(lower)) return "cni";
  if (/cyclosporin|sandimmun|neoral/i.test(lower)) return "cni";
  if (/mycophenol|cellcept|myfortic|mmf|mpa/i.test(lower)) return "antimetabolite";
  if (/everolimus|certican|sirolimus|rapamune|rapamycin/i.test(lower)) return "mtor";
  if (/prednis|metilprednis|methylpred|dexameth|steroid/i.test(lower)) return "corticosteroid";
  return "other";
}

/** Find dosage options for a medication name */
export function getMedicationDosages(medicationName: string): string[] {
  const lower = medicationName.toLowerCase().trim();
  for (const group of MEDICATION_GROUPS) {
    for (const med of group.medications) {
      if (med.name.toLowerCase() === lower) return med.dosages;
    }
  }
  return [];
}

/** Group label translation keys */
export const GROUP_LABEL_KEYS: Record<string, string> = {
  cni: "medGroup.cni",
  antimetabolite: "medGroup.antimetabolite",
  mtor: "medGroup.mtor",
  corticosteroid: "medGroup.corticosteroid",
  other: "medGroup.other",
};
