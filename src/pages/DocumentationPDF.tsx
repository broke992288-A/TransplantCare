import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { FileDown, CheckCircle, Loader2 } from "lucide-react";

/* ───────────────────────── colour palette ───────────────────────── */
const C = {
  navy:      [15, 32, 65]   as [number, number, number],
  darkBlue:  [22, 55, 100]  as [number, number, number],
  blue:      [37, 99, 175]  as [number, number, number],
  lightBlue: [220, 235, 252] as [number, number, number],
  accent:    [0, 150, 136]  as [number, number, number],
  green:     [46, 125, 50]  as [number, number, number],
  orange:    [230, 126, 34] as [number, number, number],
  red:       [198, 40, 40]  as [number, number, number],
  white:     [255, 255, 255] as [number, number, number],
  black:     [33, 33, 33]   as [number, number, number],
  grey:      [100, 100, 100] as [number, number, number],
  lightGrey: [245, 245, 245] as [number, number, number],
  tableBg:   [235, 245, 255] as [number, number, number],
  tableHead: [15, 32, 65]   as [number, number, number],
};

/* ──────────────── helper: wrapped text with page break ──────────── */
function addWrapped(
  doc: jsPDF, text: string, x: number, y: number,
  maxW: number, lineH: number, pageH: number, marginBottom: number
): number {
  const lines = doc.splitTextToSize(text, maxW) as string[];
  for (const line of lines) {
    if (y + lineH > pageH - marginBottom) {
      doc.addPage();
      y = 30;
    }
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

/* ──────────────── helper: simple table ──────────── */
function drawTable(
  doc: jsPDF, headers: string[], rows: string[][], x: number, y: number,
  colWidths: number[], pageH: number, marginBottom: number
): number {
  const rowH = 9;
  const totalW = colWidths.reduce((a, b) => a + b, 0);

  // header
  if (y + rowH * 2 > pageH - marginBottom) { doc.addPage(); y = 30; }
  doc.setFillColor(...C.tableHead);
  doc.rect(x, y - 6, totalW, rowH, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  let cx = x + 2;
  headers.forEach((h, i) => { doc.text(h, cx, y); cx += colWidths[i]; });
  y += rowH;

  // rows
  doc.setTextColor(...C.black);
  doc.setFont("helvetica", "normal");
  rows.forEach((row, ri) => {
    if (y + rowH > pageH - marginBottom) { doc.addPage(); y = 30; }
    if (ri % 2 === 0) {
      doc.setFillColor(...C.tableBg);
      doc.rect(x, y - 6, totalW, rowH, "F");
    }
    cx = x + 2;
    row.forEach((cell, i) => {
      const lines = doc.splitTextToSize(cell, colWidths[i] - 4) as string[];
      doc.text(lines[0] || "", cx, y);
      cx += colWidths[i];
    });
    y += rowH;
  });
  return y + 4;
}

/* ──────────────── SECTION HEADER ──────────────── */
function sectionHeader(doc: jsPDF, num: number, title: string, y: number, pageH: number): number {
  if (y + 25 > pageH - 20) { doc.addPage(); y = 30; }
  // accent bar
  doc.setFillColor(...C.blue);
  doc.rect(15, y - 6, 180, 12, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`${num}-BOLIM: ${title}`, 20, y + 2);
  doc.setTextColor(...C.black);
  return y + 18;
}

/* ──────────────── SUB HEADER ──────────────── */
function subHeader(doc: jsPDF, title: string, y: number, pageH: number): number {
  if (y + 15 > pageH - 20) { doc.addPage(); y = 30; }
  doc.setFillColor(...C.lightBlue);
  doc.rect(15, y - 5, 180, 9, "F");
  doc.setTextColor(...C.darkBlue);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, 18, y + 1);
  doc.setTextColor(...C.black);
  return y + 12;
}

/* ──────────────── BULLET ──────────────── */
function bullet(doc: jsPDF, text: string, x: number, y: number, pageH: number): number {
  if (y + 8 > pageH - 20) { doc.addPage(); y = 30; }
  doc.setFillColor(...C.accent);
  doc.circle(x, y - 1.5, 1.5, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.black);
  return addWrapped(doc, text, x + 5, y, 160, 5.5, pageH, 20);
}

/* ──────────────── para ──────────────── */
function para(doc: jsPDF, text: string, y: number, pageH: number): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.black);
  return addWrapped(doc, text, 18, y, 174, 5.5, pageH, 20);
}

/* ═══════════════════════ MAIN PDF BUILDER ═══════════════════════ */
function buildPDF(): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pH = 297;
  let y: number;

  /* ─── COVER PAGE ─── */
  // Full navy background
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, 210, 297, "F");

  // Accent stripe
  doc.setFillColor(...C.blue);
  doc.rect(0, 90, 210, 4, "F");
  doc.setFillColor(...C.accent);
  doc.rect(0, 94, 210, 2, "F");

  // Title
  doc.setTextColor(...C.white);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("TransplantCare", 105, 130, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Texnik Hujjatlashtirish", 105, 145, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(180, 200, 230);
  doc.text("Transplant bemorlarini kuzatish va boshqarish tizimi", 105, 160, { align: "center" });
  doc.text("To'liq texnik qo'llanma — Katta dasturchi uchun", 105, 168, { align: "center" });

  // Bottom info
  doc.setFontSize(9);
  doc.setTextColor(150, 170, 200);
  doc.text(`Versiya: 1.0  |  Sana: ${new Date().toLocaleDateString("uz-UZ")}`, 105, 250, { align: "center" });
  doc.text("Maxfiylik darajasi: ICHKI FOYDALANISH UCHUN", 105, 258, { align: "center" });

  // Accent bottom line
  doc.setFillColor(...C.accent);
  doc.rect(60, 270, 90, 1.5, "F");

  /* ─── TABLE OF CONTENTS ─── */
  doc.addPage();
  y = 30;
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, 210, 20, "F");
  doc.setTextColor(...C.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("MUNDARIJA", 105, 14, { align: "center" });

  doc.setTextColor(...C.black);
  const tocItems = [
    "1. Loyiha haqida umumiy ma'lumot",
    "2. Tizim maqsadi",
    "3. Tizim arxitekturasi",
    "4. Texnologiya steki",
    "5. Dasturlash tillari",
    "6. Frontend tuzilishi",
    "7. Backend tuzilishi (Lovable Cloud)",
    "8. Ma'lumotlar bazasi dizayni",
    "9. Sun'iy intellekt imkoniyatlari",
    "10. Asosiy tizim funksiyalari",
    "11. Xavfsizlik",
    "12. Ishlash samaradorligi va masshtablash",
    "13. Loyihaning joriy holati",
    "14. Kelajakdagi rivojlanish",
    "15. Yakuniy xulosa",
  ];
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  tocItems.forEach((item, i) => {
    y += 10;
    doc.setFillColor(...(i % 2 === 0 ? C.lightGrey : C.white));
    doc.rect(25, y - 6, 160, 9, "F");
    doc.setTextColor(...C.darkBlue);
    doc.text(item, 30, y);
  });

  /* ═══ SECTION 1 — LOYIHA HAQIDA ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 1, "LOYIHA HAQIDA UMUMIY MA'LUMOT", y, pH);

  y = subHeader(doc, "Loyiha nomi va maqsadi", y, pH);
  y = para(doc, "TransplantCare — bu transplant (ko'chirma) operatsiyasi o'tkazilgan bemorlarni kompleks kuzatish, laboratoriya natijalarini tahlil qilish, dori vositalarini nazorat qilish va sun'iy intellekt yordamida graft rad etish xavfini bashorat qilish uchun yaratilgan zamonaviy tibbiy axborot tizimi.", y, pH);
  y += 3;

  y = subHeader(doc, "Qanday tibbiy muammolarni hal qiladi", y, pH);
  y = bullet(doc, "Transplant bemorlarining laboratoriya natijalarini muntazam kuzatish va trend tahlili", 22, y, pH);
  y = bullet(doc, "Graft rad etish xavfini erta bosqichda aniqlash (AI-bashorat)", 22, y, pH);
  y = bullet(doc, "Immunosupressiv dorilar dozasini nazorat qilish va o'zgarishlar tarixini saqlash", 22, y, pH);
  y = bullet(doc, "Shifokor va bemor o'rtasidagi aloqani yaxshilash (ogohlantirishlar tizimi)", 22, y, pH);
  y = bullet(doc, "OCR orqali laboratoriya hisobotlarini avtomatik raqamlashtirish", 22, y, pH);
  y = bullet(doc, "Ko'p tilli interfeys (o'zbek, rus, ingliz)", 22, y, pH);
  y += 3;

  y = subHeader(doc, "Maqsadli foydalanuvchilar", y, pH);
  y = drawTable(doc,
    ["Foydalanuvchi", "Rol", "Asosiy funksiyalar"],
    [
      ["Shifokorlar", "doctor", "Bemorlarni boshqarish, tahlil kiritish, risk baholash"],
      ["Bemorlar", "patient", "O'z natijalarini ko'rish, dori jadvalini kuzatish"],
      ["Administratorlar", "admin", "Barcha funksiyalar + tizim sozlamalari"],
      ["Qo'llab-quvvatlash", "support", "Faqat ko'rish huquqi"],
    ],
    18, y, [45, 30, 107], pH, 20
  );

  /* ═══ SECTION 2 — TIZIM MAQSADI ═══ */
  y = sectionHeader(doc, 2, "TIZIM MAQSADI", y, pH);
  y = para(doc, "TransplantCare tizimining asosiy missiyasi — O'zbekistonda transplant tibbiyotini raqamlashtirish va bemorlar sog'lig'ini samarali kuzatish imkoniyatini yaratish. Tizim quyidagi tibbiy ish jarayonlarini qo'llab-quvvatlaydi:", y, pH);
  y += 2;
  y = bullet(doc, "Bemor ro'yxatga olish va demografik ma'lumotlarni saqlash (viloyat, tuman, qon guruhi)", 22, y, pH);
  y = bullet(doc, "Laboratoriya natijalarini kiritish, OCR orqali skanerlash va avtomatik saqlash", 22, y, pH);
  y = bullet(doc, "Risk darajasini hisoblash: laboratoriya trendlari + klinik chegaralar + AI-bashorat", 22, y, pH);
  y = bullet(doc, "Ogohlantirishlar: muhim parametrlar oshganda shifokorga darhol xabar berish", 22, y, pH);
  y = bullet(doc, "Dori vositalari nazorati: dozaj o'zgarishlari tarixi, istfe'mol kuzatuvi", 22, y, pH);
  y = bullet(doc, "Hisobotlar: oylik, choraklik, hudud bo'yicha PDF hisobotlar generatsiya qilish", 22, y, pH);

  /* ═══ SECTION 3 — TIZIM ARXITEKTURASI ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 3, "TIZIM ARXITEKTURASI", y, pH);

  y = subHeader(doc, "Umumiy arxitektura diagrammasi", y, pH);
  // ASCII-style architecture
  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.setTextColor(...C.darkBlue);
  const archLines = [
    "+------------------+     +-------------------+     +------------------+",
    "|   FOYDALANUVCHI   | --> |   REACT FRONTEND  | --> |  LOVABLE CLOUD   |",
    "|   (Brauzer)      |     |   (Vite + TS)     |     |   (Backend)      |",
    "+------------------+     +-------------------+     +------------------+",
    "                                  |                        |           ",
    "                                  v                        v           ",
    "                         +-------------------+     +------------------+",
    "                         | EDGE FUNCTIONS    |     | PostgreSQL DB    |",
    "                         | (Deno Runtime)    |     | (12 jadval)      |",
    "                         +-------------------+     +------------------+",
    "                                  |                                    ",
    "                                  v                                    ",
    "                         +-------------------+                         ",
    "                         | AI GATEWAY        |                         ",
    "                         | (Gemini/GPT)      |                         ",
    "                         +-------------------+                         ",
  ];
  archLines.forEach(line => {
    y = addWrapped(doc, line, 20, y, 180, 4.5, pH, 20);
  });
  y += 5;
  doc.setTextColor(...C.black);

  y = subHeader(doc, "Frontend arxitekturasi", y, pH);
  y = bullet(doc, "React 18 + TypeScript — komponent asosidagi SPA (Single Page Application)", 22, y, pH);
  y = bullet(doc, "Vite — tezkor build va HMR (Hot Module Replacement)", 22, y, pH);
  y = bullet(doc, "React Router v6 — marshrut boshqaruvi, himoyalangan yo'nalishlar", 22, y, pH);
  y = bullet(doc, "TanStack Query (React Query) — server holat boshqaruvi, keshlash", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Backend arxitekturasi", y, pH);
  y = bullet(doc, "Lovable Cloud (Supabase) — PostgreSQL, Auth, Storage, Edge Functions", 22, y, pH);
  y = bullet(doc, "Edge Functions — Deno runtime'da ishlovchi serverless funksiyalar", 22, y, pH);
  y = bullet(doc, "Row Level Security (RLS) — ma'lumotlar bazasi darajasida xavfsizlik", 22, y, pH);
  y = bullet(doc, "Realtime — o'zgarishlarni jonli kuzatish (WebSocket)", 22, y, pH);

  /* ═══ SECTION 4 — TEXNOLOGIYA STEKI ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 4, "TEXNOLOGIYA STEKI", y, pH);

  y = drawTable(doc,
    ["Texnologiya", "Versiya", "Maqsad"],
    [
      ["React", "18.x", "UI komponentlar kutubxonasi"],
      ["TypeScript", "5.x", "Statik tipizatsiyali dasturlash tili"],
      ["Vite", "5.x", "Build va development server"],
      ["Tailwind CSS", "3.x", "Utility-first CSS framework"],
      ["shadcn/ui", "latest", "Qayta foydalaniladigan UI komponentlar"],
      ["TanStack Query", "5.x", "Server state boshqaruvi"],
      ["React Router", "6.x", "Marshrut boshqaruvi"],
      ["React Hook Form", "7.x", "Forma boshqaruvi va validatsiya"],
      ["Zod", "3.x", "Ma'lumot validatsiya sxemalari"],
      ["Recharts", "2.x", "Grafik va diagrammalar"],
      ["jsPDF", "4.x", "PDF hisobotlar generatsiyasi"],
      ["Framer Motion", "—", "Animatsiya kutubxonasi"],
      ["Lovable Cloud", "—", "Backend (DB, Auth, Storage, Functions)"],
      ["Deno", "1.x", "Edge Functions runtime"],
      ["Gemini AI", "2.5/3.x", "AI bashorat va OCR"],
      ["Vitest", "—", "Unit va integratsiya testlar"],
    ],
    18, y, [45, 25, 112], pH, 20
  );

  /* ═══ SECTION 5 — DASTURLASH TILLARI ═══ */
  y = sectionHeader(doc, 5, "DASTURLASH TILLARI", y, pH);

  y = drawTable(doc,
    ["Til", "Qo'llanilish sohasi", "Ulushi"],
    [
      ["TypeScript", "Frontend komponentlar, hooklar, xizmatlar, Edge Functions", "~85%"],
      ["SQL", "Ma'lumotlar bazasi sxemalari, migratsiyalar, RLS siyosatlari, triggerlar", "~10%"],
      ["CSS", "Tailwind konfiguratsiya, global uslublar (index.css)", "~5%"],
    ],
    18, y, [40, 110, 32], pH, 20
  );
  y += 3;
  y = para(doc, "Loyihaning asosiy dasturlash tili TypeScript bo'lib, u frontend va backend (Edge Functions) da bir xil foydalaniladi. Bu yagona til yondashuvi (full-stack TypeScript) kod sifatini va dasturchilar unumdorligini sezilarli oshiradi.", y, pH);

  /* ═══ SECTION 6 — FRONTEND TUZILISHI ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 6, "FRONTEND TUZILISHI", y, pH);

  y = subHeader(doc, "Papka tuzilishi", y, pH);
  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.setTextColor(...C.darkBlue);
  const dirs = [
    "src/",
    "  components/",
    "    features/   — Biznes logika komponentlari (30+ fayl)",
    "    layout/     — DashboardLayout, Sidebar, TopHeader",
    "    ui/         — shadcn/ui komponentlari (50+ fayl)",
    "  hooks/        — Custom React hooklar (15+ fayl)",
    "  pages/        — Sahifa komponentlari (15 sahifa)",
    "  services/     — API xizmat qatlamlari (15+ fayl)",
    "  utils/        — Yordamchi funksiyalar",
    "  types/        — TypeScript turlari",
    "  data/         — Statik ma'lumotlar (dori katalogi, viloyatlar)",
  ];
  dirs.forEach(line => {
    y = addWrapped(doc, line, 20, y, 170, 5, pH, 20);
  });
  y += 4;
  doc.setTextColor(...C.black);

  y = subHeader(doc, "Asosiy sahifalar", y, pH);
  y = drawTable(doc,
    ["Sahifa", "Yo'nalish", "Vazifasi"],
    [
      ["Login", "/login", "Tizimga kirish"],
      ["DoctorDashboard", "/doctor-dashboard", "Shifokor bosh sahifasi"],
      ["PatientDetail", "/patient/:id", "Bemor tafsilotlari"],
      ["Patients", "/patients", "Bemorlar ro'yxati"],
      ["Analytics", "/analytics", "Statistik tahlil"],
      ["Reports", "/reports", "PDF hisobotlar"],
      ["Alerts", "/alerts", "Ogohlantirishlar"],
      ["Medications", "/medications", "Dori vositalari"],
      ["AddPatient", "/add-patient", "Yangi bemor qo'shish"],
      ["Compare", "/compare", "Bemorlarni solishtirish"],
    ],
    18, y, [42, 48, 92], pH, 20
  );

  y = subHeader(doc, "Holat boshqaruvi (State Management)", y, pH);
  y = para(doc, "Loyihada server holati TanStack Query (React Query) orqali boshqariladi. Har bir ma'lumot turi uchun alohida hook yaratilgan:", y, pH);
  y = bullet(doc, "usePatients — bemorlar ro'yxati va qidirish", 22, y, pH);
  y = bullet(doc, "useLabs — laboratoriya natijalari CRUD", 22, y, pH);
  y = bullet(doc, "useMedications — dori vositalari boshqaruvi", 22, y, pH);
  y = bullet(doc, "useRisk — risk hisoblash va snapshot", 22, y, pH);
  y = bullet(doc, "useAlerts — ogohlantirishlar boshqaruvi", 22, y, pH);
  y = bullet(doc, "usePrediction — AI bashorat so'rovlari", 22, y, pH);
  y = bullet(doc, "useAuth — autentifikatsiya holati va rol boshqaruvi", 22, y, pH);

  /* ═══ SECTION 7 — BACKEND TUZILISHI ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 7, "BACKEND TUZILISHI (LOVABLE CLOUD)", y, pH);

  y = subHeader(doc, "Backend xizmatlari", y, pH);
  y = drawTable(doc,
    ["Xizmat", "Vazifasi", "Texnologiya"],
    [
      ["Ma'lumotlar bazasi", "PostgreSQL 15 — relyatsion ma'lumotlar", "PostgREST API"],
      ["Autentifikatsiya", "Email/parol asosida foydalanuvchi boshqaruvi", "GoTrue"],
      ["Edge Functions", "Serverless API endpointlar (Deno)", "Deno Runtime"],
      ["Fayl saqlash", "Laboratoriya hisobotlari (PDF/rasm)", "S3-compat Storage"],
      ["Realtime", "Jonli ma'lumot yangilanishlari", "WebSocket"],
    ],
    18, y, [50, 70, 62], pH, 20
  );

  y = subHeader(doc, "Edge Functions ro'yxati", y, pH);
  y = drawTable(doc,
    ["Funksiya", "Vazifasi", "AI modeli", "Rate limit"],
    [
      ["predict-rejection", "Graft rad etish xavfini bashorat", "Gemini 3 Flash", "10/5min"],
      ["ocr-lab-report", "Laboratoriya hisobotini OCR skanerlash", "Gemini 2.5 Flash", "5/5min"],
      ["translate-text", "Matnni tarjima qilish", "Gemini 2.5 Flash Lite", "20/min"],
      ["recalculate-risk", "Risk balini qayta hisoblash", "Gemini 2.5 Flash", "10/5min"],
      ["system-health", "Tizim holati tekshiruvi", "—", "—"],
    ],
    18, y, [40, 52, 45, 45], pH, 20
  );

  y = subHeader(doc, "Autentifikatsiya oqimi", y, pH);
  y = bullet(doc, "1. Foydalanuvchi email va parol bilan ro'yxatdan o'tadi", 22, y, pH);
  y = bullet(doc, "2. Email tasdiqlash xati yuboriladi (auto-confirm o'chirilgan)", 22, y, pH);
  y = bullet(doc, "3. Emailni tasdiqlash → tizimga kirish → rol tanlash", 22, y, pH);
  y = bullet(doc, "4. Rol user_roles jadvaliga saqlanadi (xavfsiz alohida jadval)", 22, y, pH);
  y = bullet(doc, "5. JWT token har bir API so'rovda yuboriladi", 22, y, pH);
  y = bullet(doc, "6. RLS siyosatlari orqali ma'lumotlarga kirish nazorat qilinadi", 22, y, pH);

  /* ═══ SECTION 8 — MA'LUMOTLAR BAZASI ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 8, "MA'LUMOTLAR BAZASI DIZAYNI", y, pH);

  y = subHeader(doc, "Jadvallar ro'yxati (12 ta)", y, pH);
  y = drawTable(doc,
    ["Jadval nomi", "Qatorlar", "Vazifasi"],
    [
      ["patients", "~100+", "Bemorlar — asosiy jadval"],
      ["lab_results", "~500+", "Laboratoriya natijalari (30+ parametr)"],
      ["medications", "~200+", "Dori vositalari"],
      ["medication_adherence", "~1000+", "Dori istfe'mol kuzatuvi"],
      ["medication_changes", "~100+", "Dozaj o'zgarishlari tarixi"],
      ["risk_snapshots", "~500+", "Risk hisoblash tarixi"],
      ["patient_alerts", "~300+", "Ogohlantirishlar"],
      ["patient_events", "~500+", "Bemor hodisalari logi"],
      ["lab_schedules", "~200+", "Laboratoriya jadvallari"],
      ["clinical_thresholds", "~50+", "Klinik chegaralar (KDIGO/BANFF)"],
      ["audit_logs", "~1000+", "Tizim audit loglari"],
      ["user_roles", "~50+", "Foydalanuvchi rollari"],
    ],
    18, y, [50, 25, 107], pH, 20
  );

  y = subHeader(doc, "Asosiy bog'lanishlar", y, pH);
  y = bullet(doc, "patients (1) → lab_results (N) — patient_id FK", 22, y, pH);
  y = bullet(doc, "patients (1) → medications (N) — patient_id FK", 22, y, pH);
  y = bullet(doc, "patients (1) → risk_snapshots (N) — patient_id FK", 22, y, pH);
  y = bullet(doc, "patients (1) → patient_alerts (N) — patient_id FK", 22, y, pH);
  y = bullet(doc, "medications (1) → medication_adherence (N) — medication_id FK", 22, y, pH);
  y = bullet(doc, "lab_results (1) → risk_snapshots (1) — lab_result_id FK", 22, y, pH);
  y += 3;

  y = subHeader(doc, "Saqlangan protseduralar va triggerlar", y, pH);
  y = drawTable(doc,
    ["Nomi", "Turi", "Vazifasi"],
    [
      ["insert_lab_and_recalculate", "Function", "Lab kiritish + risk qayta hisoblash (tranzaksion)"],
      ["generate_lab_schedule", "Function", "Transplant sanasi bo'yicha jadval generatsiyasi"],
      ["has_role", "Function", "RLS uchun rol tekshiruvi (SECURITY DEFINER)"],
      ["register_patient_self", "Function", "Bemor o'zi ro'yxatdan o'tish"],
      ["normalize_phone", "Function", "Telefon raqamini standartlashtirish"],
    ],
    18, y, [55, 25, 102], pH, 20
  );

  /* ═══ SECTION 9 — AI IMKONIYATLARI ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 9, "SUN'IY INTELLEKT IMKONIYATLARI", y, pH);

  y = subHeader(doc, "AI integratsiya arxitekturasi", y, pH);
  y = para(doc, "Tizim Lovable AI Gateway orqali Google Gemini va OpenAI modellariga ulanadi. API kaliti server tomonida saqlanadi, klient faqat Edge Function'ga so'rov yuboradi.", y, pH);
  y += 3;

  y = drawTable(doc,
    ["Funksiya", "Model", "Kirish", "Chiqish"],
    [
      ["Graft rad bashorati", "Gemini 3 Flash", "Lab trendlari + qon guruhi", "Risk daraja + sabab + vaqt"],
      ["OCR skanerlash", "Gemini 2.5 Flash", "PDF/rasm (base64)", "Strukturalangan lab natijalar"],
      ["Tarjima", "Gemini 2.5 Flash Lite", "Matn + maqsad til", "Tarjima qilingan matn"],
      ["Risk qayta hisoblash", "Gemini 2.5 Flash", "Lab + klinik chegaralar", "Risk ball + bayroqlar"],
    ],
    18, y, [40, 42, 52, 48], pH, 20
  );
  y += 3;

  y = subHeader(doc, "AI bashorat tafsilotlari", y, pH);
  y = bullet(doc, "Tool Calling: AI strukturalangan javob qaytarishi uchun function calling ishlatiladi", 22, y, pH);
  y = bullet(doc, "Jigar transplanti: ALT, AST, Tacrolimus, Bilirubin, GGT, ALP trend tahlili", 22, y, pH);
  y = bullet(doc, "Buyrak transplanti: Kreatinin, eGFR, Proteinuriya, Kaliy trend tahlili", 22, y, pH);
  y = bullet(doc, "Qon guruhi mos kelmasligi — AMR (Antibody-Mediated Rejection) xavfini oshiradi", 22, y, pH);
  y = bullet(doc, "Ogohlantirish: Barcha AI natijalar 'Shifokor tomonidan tekshirilishi shart' izohi bilan chiqadi", 22, y, pH);

  /* ═══ SECTION 10 — ASOSIY FUNKSIYALAR ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 10, "ASOSIY TIZIM FUNKSIYALARI", y, pH);

  y = subHeader(doc, "Bemorlarni boshqarish", y, pH);
  y = bullet(doc, "Bemor ro'yxatga olish: ism, tug'ilgan sana, jins, viloyat, tuman, organ turi", 22, y, pH);
  y = bullet(doc, "Qon guruhi va donor qon guruhi, titer terapiya holati", 22, y, pH);
  y = bullet(doc, "Transplant tarixi: sana, raqam, dializ tarixi", 22, y, pH);
  y = bullet(doc, "Bemorlarni qidirish, filtrlash va saralash", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Laboratoriya natijalari", y, pH);
  y = bullet(doc, "30+ parametr qo'llab-quvvatlanadi (kreatinin, ALT, AST, tacrolimus va boshqalar)", 22, y, pH);
  y = bullet(doc, "Qo'lda kiritish yoki OCR orqali avtomatik raqamlashtirish", 22, y, pH);
  y = bullet(doc, "Trend grafiklari (Recharts) — vaqt bo'yicha parametr o'zgarishi", 22, y, pH);
  y = bullet(doc, "Natijalar tarixini jadval va grafik ko'rinishida ko'rish", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Risk tahlili", y, pH);
  y = bullet(doc, "Algoritmik risk hisoblash: klinik chegaralar + trend tahlili", 22, y, pH);
  y = bullet(doc, "AI bashorat: graft rad etish ehtimoli (7-14 kun)", 22, y, pH);
  y = bullet(doc, "Risk snapshotlar tarixi — vaqt bo'yicha risk o'zgarishini kuzatish", 22, y, pH);
  y = bullet(doc, "Ustuvorlik paneli: eng yuqori riskli bemorlar birinchi", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Ogohlantirishlar", y, pH);
  y = bullet(doc, "Muhim lab parametrlari oshganda avtomatik ogohlantirishlar", 22, y, pH);
  y = bullet(doc, "Muddati o'tgan laboratoriya jadvallari haqida eslatmalar", 22, y, pH);
  y = bullet(doc, "O'qilmagan ogohlantirishlar soni — bosh sahifada ko'rsatiladi", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Dori vositalari nazorati", y, pH);
  y = bullet(doc, "Dori qo'shish, dozaj o'zgartirish, to'xtatish", 22, y, pH);
  y = bullet(doc, "Dozaj o'zgarishlari tarixi (kim, qachon, nima uchun)", 22, y, pH);
  y = bullet(doc, "Istfe'mol kuzatuvi (adherence tracking)", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Hisobotlar", y, pH);
  y = bullet(doc, "Oylik reeystr, choraklik statistika, dori istfe'moli, hudud tahlili", 22, y, pH);
  y = bullet(doc, "jsPDF orqali klient tomonida PDF generatsiya", 22, y, pH);

  /* ═══ SECTION 11 — XAVFSIZLIK ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 11, "XAVFSIZLIK", y, pH);

  y = subHeader(doc, "Autentifikatsiya", y, pH);
  y = bullet(doc, "Email + parol asosida ro'yxatdan o'tish va kirish", 22, y, pH);
  y = bullet(doc, "Email tasdiqlash majburiy (auto-confirm o'chirilgan)", 22, y, pH);
  y = bullet(doc, "JWT tokenlar — har bir API so'rovda Authorization header", 22, y, pH);
  y = bullet(doc, "Sessiya muddati tugashi (session timeout) — useSessionTimeout hook", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Avtorizatsiya (RBAC)", y, pH);
  y = bullet(doc, "4 ta rol: admin, doctor, patient, support", 22, y, pH);
  y = bullet(doc, "Rollar alohida user_roles jadvalida (privilege escalation himoyasi)", 22, y, pH);
  y = bullet(doc, "has_role() funksiyasi — SECURITY DEFINER (RLS rekursiyasiz)", 22, y, pH);
  y = bullet(doc, "Frontend: ProtectedRoute, DoctorOrAdminRoute komponentlari", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Row Level Security (RLS)", y, pH);
  y = para(doc, "Barcha jadvallarida RLS yoqilgan. Har bir jadval uchun SELECT, INSERT, UPDATE, DELETE siyosatlari mavjud. Shifokor faqat o'ziga biriktirilgan bemorlarni ko'radi, admin barcha ma'lumotlarga kira oladi.", y, pH);
  y += 2;

  y = subHeader(doc, "API xavfsizligi", y, pH);
  y = bullet(doc, "Rate limiting: barcha Edge Functions uchun foydalanuvchi asosida cheklov", 22, y, pH);
  y = bullet(doc, "CORS: faqat ruxsat berilgan domenlardan so'rovlar qabul qilinadi", 22, y, pH);
  y = bullet(doc, "Storage RLS: fayl egasi, biriktirilgan shifokor yoki admin faqat kira oladi", 22, y, pH);
  y = bullet(doc, "Audit log: muhim harakatlar audit_logs jadvaliga yoziladi", 22, y, pH);

  /* ═══ SECTION 12 — ISHLASH SAMARADORLIGI ═══ */
  y = sectionHeader(doc, 12, "ISHLASH SAMARADORLIGI VA MASSHTABLASH", y, pH);

  y = subHeader(doc, "Frontend optimizatsiya", y, pH);
  y = bullet(doc, "Code splitting: React.lazy() — sahifalar lazy-load qilinadi", 22, y, pH);
  y = bullet(doc, "TanStack Query keshlash: staleTime 2 daqiqa, gcTime 10 daqiqa", 22, y, pH);
  y = bullet(doc, "Refetch on window focus — foydalanuvchi qaytganda yangilanadi", 22, y, pH);
  y = bullet(doc, "Skeleton loading — ma'lumot yuklanayotganda placeholder", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Backend optimizatsiya", y, pH);
  y = bullet(doc, "insert_lab_and_recalculate — bitta tranzaksiyada lab + risk", 22, y, pH);
  y = bullet(doc, "Indekslar: patient_id va recorded_at ustunlarida avtomatik indeks", 22, y, pH);
  y = bullet(doc, "Edge Functions: cold start minimal (Deno lightweight runtime)", 22, y, pH);
  y = bullet(doc, "Rate limiting: AI funksiyalarga suistfe'molni oldini olish", 22, y, pH);
  y += 2;

  y = subHeader(doc, "Masshtablash strategiyasi", y, pH);
  y = bullet(doc, "Gorizontal: Edge Functions avtomatik masshtablanadi", 22, y, pH);
  y = bullet(doc, "Vertikal: PostgreSQL connection pooling (PgBouncer)", 22, y, pH);
  y = bullet(doc, "Ma'lumot: pagination va limit qo'llaniladi (standart 1000 qator)", 22, y, pH);

  /* ═══ SECTION 13 — JORIY HOLAT ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 13, "LOYIHANING JORIY HOLATI", y, pH);

  y = subHeader(doc, "Tugallangan modullar (~92%)", y, pH);
  y = drawTable(doc,
    ["Modul", "Holat", "Tayyor %"],
    [
      ["Autentifikatsiya va RBAC", "Tugallangan", "100%"],
      ["Bemorlarni boshqarish", "Tugallangan", "100%"],
      ["Laboratoriya natijalari", "Tugallangan", "100%"],
      ["Risk tahlili", "Tugallangan", "95%"],
      ["AI bashorat", "Tugallangan", "95%"],
      ["OCR skanerlash", "Tugallangan", "90%"],
      ["Dori vositalari", "Tugallangan", "95%"],
      ["Ogohlantirishlar", "Tugallangan", "90%"],
      ["Hisobotlar (PDF)", "Tugallangan", "90%"],
      ["Ko'p tilli interfeys", "Tugallangan", "85%"],
      ["Realtime yangilanishlar", "Tugallangan", "90%"],
      ["Audit logging", "Tugallangan", "80%"],
    ],
    18, y, [65, 40, 77], pH, 20
  );

  y = subHeader(doc, "Rejalashtirilgan yaxshilanishlar", y, pH);
  y = bullet(doc, "Bemor mobil ilovasi (PWA yoki React Native)", 22, y, pH);
  y = bullet(doc, "SMS/Telegram ogohlantirishlar integratsiyasi", 22, y, pH);
  y = bullet(doc, "Kengaytirilgan analitika dashboard", 22, y, pH);
  y = bullet(doc, "Chet el klinikalar bilan interoperabilite (FHIR/HL7)", 22, y, pH);

  /* ═══ SECTION 14 — KELAJAK ═══ */
  y = sectionHeader(doc, 14, "KELAJAKDAGI RIVOJLANISH", y, pH);

  y = para(doc, "TransplantCare platformasi kelajakda quyidagi tibbiy yo'nalishlarga kengaytirilishi rejalashtirilgan:", y, pH);
  y += 3;

  y = drawTable(doc,
    ["Modul", "Maqsad", "Ustuvorlik"],
    [
      ["Onkologiya", "Saraton bemorlarini kuzatish, kimyoterapiya nazorati", "Yuqori"],
      ["Kardiologiya", "Yurak kasalliklari, EKG tahlili, stent kuzatuvi", "O'rta"],
      ["Ortopediya", "Suyak-bo'g'im operatsiyalari, reabilitatsiya kuzatuvi", "Past"],
      ["Urologiya", "Buyrak tosh kasalligi, dializ boshqaruvi", "O'rta"],
      ["Pediatriya", "Bolalar transplantatsiyasi — maxsus dozaj hisoblash", "Yuqori"],
    ],
    18, y, [35, 80, 67], pH, 20
  );

  /* ═══ SECTION 15 — XULOSA ═══ */
  doc.addPage();
  y = 30;
  y = sectionHeader(doc, 15, "YAKUNIY XULOSA", y, pH);

  y = para(doc, "TransplantCare — O'zbekistonda transplant tibbiyotini raqamlashtirish yo'lida muhim qadam. Tizim zamonaviy veb texnologiyalar (React, TypeScript, Lovable Cloud) va sun'iy intellekt (Google Gemini) ni birlashtirib, shifokorlarga quyidagi imkoniyatlarni taqdim etadi:", y, pH);
  y += 3;

  y = bullet(doc, "Bemorlarni markazlashtirilgan holda boshqarish va laboratoriya natijalarini kuzatish", 22, y, pH);
  y = bullet(doc, "AI yordamida graft rad etish xavfini 7-14 kun oldin bashorat qilish", 22, y, pH);
  y = bullet(doc, "Immunosupressiv dorilar dozasini aniq nazorat qilish", 22, y, pH);
  y = bullet(doc, "Muhim parametrlar oshganda darhol ogohlantirishlar olish", 22, y, pH);
  y = bullet(doc, "OCR orqali qog'oz hisobotlarni raqamlashtirish", 22, y, pH);
  y = bullet(doc, "Xavfsiz, masshtablanadigan va kengaytiriladigan arxitektura", 22, y, pH);
  y += 5;

  // Final box
  if (y + 30 > pH - 20) { doc.addPage(); y = 30; }
  doc.setFillColor(...C.lightBlue);
  doc.roundedRect(18, y, 174, 28, 3, 3, "F");
  doc.setDrawColor(...C.blue);
  doc.roundedRect(18, y, 174, 28, 3, 3, "S");
  doc.setTextColor(...C.darkBlue);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Tizim haqiqiy tibbiy muhitda qo'llanilishga tayyor.", 105, y + 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Tibbiy ma'lumotlar maxfiyligini ta'minlash uchun barcha xavfsizlik", 105, y + 18, { align: "center" });
  doc.text("choralari joriy etilgan (RLS, RBAC, rate limiting, audit log).", 105, y + 24, { align: "center" });

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...C.grey);
    doc.text(`TransplantCare Texnik Hujjat  |  Sahifa ${i}/${totalPages}`, 105, 290, { align: "center" });
    // bottom accent line
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(0.5);
    doc.line(15, 285, 195, 285);
  }

  return doc;
}

/* ════════════════ REACT PAGE ════════════════ */
export default function DocumentationPDF() {
  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");

  const handleGenerate = () => {
    setStatus("generating");
    setTimeout(() => {
      try {
        const doc = buildPDF();
        doc.save("TransplantCare_Texnik_Hujjat.pdf");
        setStatus("done");
      } catch (e) {
        console.error("PDF generation error:", e);
        setStatus("idle");
      }
    }, 100);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-10 shadow-lg max-w-md w-full">
        <div className="rounded-full bg-primary/10 p-4">
          <FileDown className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center">
          TransplantCare Texnik Hujjat
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          15 bo'limli to'liq texnik hujjatlashtirish — PDF formatda, rangli jadvallar va diagrammalar bilan.
        </p>
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleGenerate}
          disabled={status === "generating"}
        >
          {status === "generating" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Yaratilmoqda...
            </>
          ) : status === "done" ? (
            <>
              <CheckCircle className="h-5 w-5" />
              Tayyor! Qayta yuklash
            </>
          ) : (
            <>
              <FileDown className="h-5 w-5" />
              PDF Hujjatni Yuklab Olish
            </>
          )}
        </Button>
        {status === "done" && (
          <p className="text-xs text-green-600">
            ✅ Fayl muvaffaqiyatli yuklab olindi!
          </p>
        )}
      </div>
    </div>
  );
}
