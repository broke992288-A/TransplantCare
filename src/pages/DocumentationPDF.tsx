import { useLanguage, type Language } from "@/hooks/useLanguage";
import { useTx } from "@/i18n/uiText";
import { translateDocument } from "@/i18n/documentText";
import LanguageSelector from "@/components/features/LanguageSelector";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, CheckCircle, Loader2, Languages } from "lucide-react";

/* ═══════════════ ЎЗБЕК ЛОТИН → КИРИЛ КОНВЕРТЕР ═══════════════ */

const TECH_TERMS = /\b(React|TypeScript|Vite|PostgreSQL|PostgREST|JWT|API|CORS|RLS|RBAC|PDF|CRUD|SPA|HMR|OCR|FHIR|HL7|CSS|HTML|CDN|SDK|PWA|UI|UX|TLS|SSL|UUID|KDIGO|BANFF|Supabase|Lovable|Cloud|Edge|Functions?|Deno|Runtime|Gemini|GPT|OpenAI|Google|Tailwind|shadcn|TanStack|Query|Recharts|jsPDF|pdfMake|Framer|Motion|Vitest|Zod|PgBouncer|WebSocket|GoTrue|S3|JSON|SQL|HTTP|HTTPS|GET|POST|PUT|DELETE|AMR|EKG|GFR|eGFR|ALT|AST|GGT|ALP|INR|CRP|ESR|LDH|FK|SELECT|INSERT|UPDATE|SECURITY|DEFINER|DashboardLayout|Sidebar|TopHeader|usePatients|useLabs|useMedications|useRisk|useAlerts|usePrediction|useAuth|TransplantCare|PatientDetail|DoctorDashboard|AddPatient|Login|Analytics|Reports|Alerts|Medications|Compare|cold\s*start|patient_id|recorded_at|lab_result_id|medication_id|user_roles|has_role|insert_lab_and_recalculate|generate_lab_schedule|register_patient_self|normalize_phone|patients|lab_results|medications|medication_adherence|medication_changes|risk_snapshots|patient_alerts|patient_events|lab_schedules|clinical_thresholds|audit_logs|transplant_episodes|ProtectedRoute|DoctorOrAdminRoute|React\.lazy|staleTime|gcTime|useSessionTimeout)\b/g;

function uzToCyr(s: string): string {
  // Preserve tech terms with placeholders
  const techs: string[] = [];
  let safe = s.replace(TECH_TERMS, (m) => { techs.push(m); return `\x00${techs.length - 1}\x00`; });

  // Digraphs first
  safe = safe
    .replace(/SH/g, 'Ш').replace(/Sh/g, 'Ш').replace(/sh/g, 'ш')
    .replace(/CH/g, 'Ч').replace(/Ch/g, 'Ч').replace(/ch/g, 'ч')
    .replace(/O'/g, 'Ў').replace(/o'/g, 'ў')
    .replace(/G'/g, 'Ғ').replace(/g'/g, 'ғ')
    .replace(/Yo/g, 'Ё').replace(/yo/g, 'ё')
    .replace(/Yu/g, 'Ю').replace(/yu/g, 'ю')
    .replace(/Ya/g, 'Я').replace(/ya/g, 'я')
    .replace(/Ye/g, 'Е').replace(/ye/g, 'е')
    .replace(/Ts/g, 'Ц').replace(/ts/g, 'ц');

  // Single character map
  const map: Record<string, string> = {
    'A':'А','a':'а','B':'Б','b':'б','D':'Д','d':'д','E':'Е','e':'е',
    'F':'Ф','f':'ф','G':'Г','g':'г','H':'Ҳ','h':'ҳ','I':'И','i':'и',
    'J':'Ж','j':'ж','K':'К','k':'к','L':'Л','l':'л','M':'М','m':'м',
    'N':'Н','n':'н','O':'О','o':'о','P':'П','p':'п','Q':'Қ','q':'қ',
    'R':'Р','r':'р','S':'С','s':'с','T':'Т','t':'т','U':'У','u':'у',
    'V':'В','v':'в','X':'Х','x':'х','Y':'Й','y':'й','Z':'З','z':'з',
  };
  safe = safe.replace(/[A-Za-z]/g, ch => map[ch] || ch);

  // Restore tech terms
  safe = safe.replace(/\x00(\d+)\x00/g, (_, i) => techs[Number(i)]);
  return safe;
}

type Variant = 'lat' | 'cyr';

function t(text: string, variant: Variant): string {
  return variant === 'lat' ? text : uzToCyr(text);
}

/* ═══════════════ PDF ГЕНЕРАТОР (pdfmake) ═══════════════ */

async function generateDoc(variant: Variant, lang: Language) {
  const t = (text: string, script: Variant) => lang === "uz" ? (script === "cyr" ? uzToCyr(text) : text) : translateDocument(text, lang);
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const vfs = (pdfFontsModule as any).default?.pdfMake?.vfs
    || (pdfFontsModule as any).pdfMake?.vfs
    || (pdfFontsModule as any).default?.vfs
    || (pdfFontsModule as any).vfs;
  if (vfs) (pdfMake as any).vfs = vfs;

  const NAVY = '#0F2041';
  const BLUE = '#2563AF';
  const LIGHT_BLUE = '#DCEBFC';
  const ACCENT = '#009688';
  const DARK = '#212121';
  const GREY = '#646464';

  const today = new Date().toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'uz' ? 'uz-UZ' : 'en-GB');
  const variantLabel = lang === 'uz' ? (variant === 'lat' ? t('Lotin alifbosi', variant) : t('Кирил алифбоси', variant)) : lang === 'ru' ? 'Русский' : 'English';

  /* --- Section helper --- */
  function section(num: number, title: string): any {
    return {
      text: `${num}-${t("BO'LIM", variant)}: ${t(title, variant)}`,
      fontSize: 14, bold: true, color: 'white',
      background: BLUE, margin: [0, 15, 0, 10],
      pageBreak: num > 1 ? 'before' as const : undefined,
    };
  }

  function sub(title: string): any {
    return {
      text: t(title, variant),
      fontSize: 11, bold: true, color: NAVY,
      margin: [0, 8, 0, 4],
      decoration: 'underline' as const,
    };
  }

  function p(text: string): any {
    return { text: t(text, variant), fontSize: 9, color: DARK, margin: [0, 2, 0, 4], lineHeight: 1.4 };
  }

  function bullets(items: string[]): any {
    return {
      ul: items.map(i => ({ text: t(i, variant), fontSize: 9, color: DARK, lineHeight: 1.4 })),
      margin: [10, 2, 0, 6],
      markerColor: ACCENT,
    };
  }

  function table(headers: string[], rows: string[][], widths?: (string | number)[]): any {
    return {
      table: {
        headerRows: 1,
        widths: widths || headers.map(() => '*'),
        body: [
          headers.map(h => ({ text: t(h, variant), bold: true, fontSize: 8, color: 'white', fillColor: NAVY, margin: [2, 3, 2, 3] })),
          ...rows.map((row, ri) =>
            row.map(cell => ({ text: t(cell, variant), fontSize: 8, color: DARK, fillColor: ri % 2 === 0 ? LIGHT_BLUE : 'white', margin: [2, 2, 2, 2] }))
          ),
        ],
      },
      layout: { hLineColor: () => '#ccc', vLineColor: () => '#ccc', hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
      margin: [0, 4, 0, 8] as [number, number, number, number],
    };
  }

  const content: any[] = [
    /* ═══ MUQOVA ═══ */
    {
      stack: [
        { text: '\n\n\n\n\n\n\n\n' },
        { text: 'TransplantCare', fontSize: 32, bold: true, color: NAVY, alignment: 'center' },
        { canvas: [{ type: 'line', x1: 120, y1: 5, x2: 380, y2: 5, lineWidth: 3, lineColor: ACCENT }], margin: [0, 5, 0, 5] },
        { text: t("Texnik hujjatlashtirish", variant), fontSize: 16, color: BLUE, alignment: 'center', margin: [0, 10, 0, 5] },
        { text: t("Transplant bemorlarini kuzatish va boshqarish tizimi", variant), fontSize: 10, color: GREY, alignment: 'center' },
        { text: t("To'liq texnik qo'llanma", variant), fontSize: 10, color: GREY, alignment: 'center', margin: [0, 3, 0, 0] },
        { text: '\n\n\n\n\n\n\n\n\n\n' },
        { text: `${t("Versiya", variant)}: 1.0  |  ${t("Sana", variant)}: ${today}`, fontSize: 9, color: GREY, alignment: 'center' },
        { text: variantLabel, fontSize: 9, color: ACCENT, alignment: 'center', margin: [0, 5, 0, 0] },
        { text: t("Maxfiylik darajasi: ICHKI FOYDALANISH UCHUN", variant), fontSize: 8, color: GREY, alignment: 'center', margin: [0, 5, 0, 0] },
      ],
      pageBreak: 'after' as const,
    },

    /* ═══ MUNDARIJA ═══ */
    { text: t("MUNDARIJA", variant), fontSize: 16, bold: true, color: NAVY, alignment: 'center', margin: [0, 0, 0, 15] },
    {
      ol: [
        t("Loyiha haqida umumiy ma'lumot", variant),
        t("Tizim maqsadi", variant),
        t("Tizim arxitekturasi", variant),
        t("Texnologiya steki", variant),
        t("Dasturlash tillari", variant),
        t("Frontend tuzilishi", variant),
        t("Backend tuzilishi (Lovable Cloud)", variant),
        t("Ma'lumotlar bazasi dizayni", variant),
        t("Sun'iy intellekt imkoniyatlari", variant),
        t("Asosiy tizim funksiyalari", variant),
        t("Xavfsizlik", variant),
        t("Ishlash samaradorligi va masshtablash", variant),
        t("Loyihaning joriy holati", variant),
        t("Kelajakdagi rivojlanish", variant),
        t("Yakuniy xulosa", variant),
      ].map(item => ({ text: item, fontSize: 11, color: DARK, margin: [0, 3, 0, 3] })),
      margin: [30, 0, 0, 0],
    },

    /* ═══ 1 ═══ */
    section(1, t("LOYIHA HAQIDA UMUMIY MA'LUMOT", variant)),
    sub(t("Loyiha nomi va maqsadi", variant)),
    p(t("TransplantCare — bu transplant (ko'chirma) operatsiyasi o'tkazilgan bemorlarni kompleks kuzatish, laboratoriya natijalarini tahlil qilish, dori vositalarini nazorat qilish va sun'iy intellekt yordamida graft rad etish xavfini bashorat qilish uchun yaratilgan zamonaviy tibbiy axborot tizimi.", variant)),

    sub(t("Qanday tibbiy muammolarni hal qiladi", variant)),
    bullets([
      t("Transplant bemorlarining laboratoriya natijalarini muntazam kuzatish va trend tahlili", variant),
      t("Graft rad etish xavfini erta bosqichda aniqlash (AI bashorat)", variant),
      t("Immunosupressiv dorilar dozasini nazorat qilish va o'zgarishlar tarixini saqlash", variant),
      t("Shifokor va bemor o'rtasidagi aloqani yaxshilash (ogohlantirishlar tizimi)", variant),
      t("OCR orqali laboratoriya hisobotlarini avtomatik raqamlashtirish", variant),
      t("Ko'p tilli interfeys (o'zbek, rus, ingliz)", variant),
    ]),

    sub(t("Maqsadli foydalanuvchilar", variant)),
    table(
      [t("Foydalanuvchi", variant), t("Rol", variant), t("Asosiy funksiyalar", variant)],
      [
        [t("Shifokorlar", variant), "doctor", t("Bemorlarni boshqarish, tahlil kiritish, risk baholash", variant)],
        [t("Bemorlar", variant), "patient", t("O'z natijalarini ko'rish, dori jadvalini kuzatish", variant)],
        [t("Administratorlar", variant), "admin", t("Barcha funksiyalar + tizim sozlamalari", variant)],
        [t("Qo'llab-quvvatlash", variant), "support", t("Faqat ko'rish huquqi", variant)],
      ],
    ),

    /* ═══ 2 ═══ */
    section(2, t("TIZIM MAQSADI", variant)),
    p(t("TransplantCare tizimining asosiy missiyasi — O'zbekistonda transplant tibbiyotini raqamlashtirish va bemorlar sog'lig'ini samarali kuzatish imkoniyatini yaratish. Tizim quyidagi tibbiy ish jarayonlarini qo'llab-quvvatlaydi:", variant)),
    bullets([
      t("Bemor ro'yxatga olish va demografik ma'lumotlarni saqlash (viloyat, tuman, qon guruhi)", variant),
      t("Laboratoriya natijalarini kiritish, OCR orqali skanerlash va avtomatik saqlash", variant),
      t("Risk darajasini hisoblash: laboratoriya trendlari + klinik chegaralar + AI bashorat", variant),
      t("Ogohlantirishlar: muhim parametrlar oshganda shifokorga darhol xabar berish", variant),
      t("Dori vositalari nazorati: dozaj o'zgarishlari tarixi, iste'mol kuzatuvi", variant),
      t("Hisobotlar: oylik, choraklik, hudud bo'yicha PDF hisobotlar generatsiya qilish", variant),
    ]),

    /* ═══ 3 ═══ */
    section(3, t("TIZIM ARXITEKTURASI", variant)),
    sub(t("Umumiy arxitektura", variant)),
    p(t("Tizim uch qatlamli arxitekturaga asoslangan: foydalanuvchi brauzeri (React frontend), Lovable Cloud backend (PostgreSQL, Auth, Edge Functions) va AI Gateway (Google Gemini, OpenAI).", variant)),
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            { text: t("FOYDALANUVCHI\n(Brauzer)", variant), alignment: 'center', bold: true, fontSize: 9, fillColor: LIGHT_BLUE, margin: [0, 5, 0, 5] },
            { text: "REACT FRONTEND\n(Vite + TypeScript)", alignment: 'center', bold: true, fontSize: 9, fillColor: LIGHT_BLUE, margin: [0, 5, 0, 5] },
            { text: "LOVABLE CLOUD\n(Backend)", alignment: 'center', bold: true, fontSize: 9, fillColor: LIGHT_BLUE, margin: [0, 5, 0, 5] },
          ],
          [
            { text: '', border: [false, false, false, false] },
            { text: "EDGE FUNCTIONS\n(Deno Runtime)", alignment: 'center', fontSize: 8, fillColor: '#E8F5E9', margin: [0, 5, 0, 5] },
            { text: "PostgreSQL DB\n(13 " + t("jadval", variant) + ")", alignment: 'center', fontSize: 8, fillColor: '#E8F5E9', margin: [0, 5, 0, 5] },
          ],
          [
            { text: '', border: [false, false, false, false] },
            { text: "AI GATEWAY\n(Gemini / GPT)", alignment: 'center', fontSize: 8, fillColor: '#FFF3E0', margin: [0, 5, 0, 5] },
            { text: '', border: [false, false, false, false] },
          ],
        ],
      },
      layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#ccc', vLineColor: () => '#ccc' },
      margin: [0, 5, 0, 10] as [number, number, number, number],
    },

    sub(t("Frontend arxitekturasi", variant)),
    bullets([
      t("React 18 + TypeScript — komponentlarga asoslangan SPA", variant),
      t("Vite — tezkor build va HMR (Hot Module Replacement)", variant),
      t("React Router v6 — marshrut boshqaruvi, himoyalangan yo'nalishlar", variant),
      t("TanStack Query (React Query) — server holat boshqaruvi, keshlash", variant),
    ]),

    sub(t("Backend arxitekturasi", variant)),
    bullets([
      "Lovable Cloud — PostgreSQL, Auth, Storage, Edge Functions",
      t("Edge Functions — Deno muhitida ishlovchi serverless funksiyalar", variant),
      t("RLS (Row Level Security) — ma'lumotlar bazasi darajasida xavfsizlik", variant),
      t("Realtime — o'zgarishlarni jonli kuzatish (WebSocket)", variant),
    ]),

    /* ═══ 4 ═══ */
    section(4, t("TEXNOLOGIYA STEKI", variant)),
    table(
      [t("Texnologiya", variant), t("Versiya", variant), t("Maqsad", variant)],
      [
        ["React", "18.x", t("UI komponentlar kutubxonasi", variant)],
        ["TypeScript", "5.x", t("Statik tipizatsiyali dasturlash tili", variant)],
        ["Vite", "5.x", t("Build va development server", variant)],
        ["Tailwind CSS", "3.x", t("Utility-first CSS freymvork", variant)],
        ["shadcn/ui", "—", t("Qayta foydalaniladigan UI komponentlar", variant)],
        ["TanStack Query", "5.x", t("Server holat boshqaruvi", variant)],
        ["React Router", "6.x", t("Marshrut boshqaruvi", variant)],
        ["Zod", "3.x", t("Ma'lumot validatsiya sxemalari", variant)],
        ["Recharts", "2.x", t("Grafik va diagrammalar", variant)],
        ["jsPDF + pdfMake", "—", t("PDF hisobotlar generatsiyasi", variant)],
        ["Lovable Cloud", "—", "Backend (DB, Auth, Storage, Functions)"],
        ["Deno", "1.x", t("Edge Functions muhiti", variant)],
        ["Gemini AI", "2.5–3.x", t("AI bashorat va OCR", variant)],
        ["Vitest", "—", t("Unit va integratsiya testlar", variant)],
      ],
      [80, 50, '*'],
    ),

    /* ═══ 5 ═══ */
    section(5, t("DASTURLASH TILLARI", variant)),
    table(
      [t("Til", variant), t("Qo'llanilish sohasi", variant), t("Ulushi", variant)],
      [
        ["TypeScript", t("Frontend komponentlar, hooklar, xizmatlar, Edge Functions", variant), "~85%"],
        ["SQL", t("Ma'lumotlar bazasi sxemalari, migratsiyalar, RLS siyosatlari, triggerlar", variant), "~10%"],
        ["CSS", t("Tailwind konfiguratsiya, global uslublar (index.css)", variant), "~5%"],
      ],
      [60, '*', 40],
    ),
    p(t("Loyihaning asosiy dasturlash tili TypeScript bo'lib, u frontend va backend (Edge Functions) da bir xil foydalaniladi. Bu yagona til yondashuvi (full-stack TypeScript) kod sifatini va dasturchilar unumdorligini sezilarli oshiradi.", variant)),

    /* ═══ 6 ═══ */
    section(6, t("FRONTEND TUZILISHI", variant)),
    sub(t("Papka tuzilishi", variant)),
    {
      text: [
        "src/\n",
        "  components/features/  — " + t("Biznes logika komponentlari (30+ fayl)", variant) + "\n",
        "  components/layout/    — DashboardLayout, Sidebar, TopHeader\n",
        "  components/ui/        — shadcn/ui " + t("komponentlari (50+ fayl)", variant) + "\n",
        "  hooks/                — " + t("Custom React hooklar (15+ fayl)", variant) + "\n",
        "  pages/                — " + t("Sahifa komponentlari (15 sahifa)", variant) + "\n",
        "  services/             — API " + t("xizmat qatlamlari (15+ fayl)", variant) + "\n",
        "  utils/                — " + t("Yordamchi funksiyalar", variant) + "\n",
        "  types/                — TypeScript " + t("turlari", variant) + "\n",
        "  data/                 — " + t("Statik ma'lumotlar", variant),
      ].join(''),
      fontSize: 8, color: NAVY, margin: [10, 4, 0, 8],
    },

    sub(t("Asosiy sahifalar", variant)),
    table(
      [t("Sahifa", variant), t("Yo'nalish", variant), t("Vazifasi", variant)],
      [
        ["Login", "/login", t("Tizimga kirish", variant)],
        ["DoctorDashboard", "/doctor-dashboard", t("Shifokor bosh sahifasi", variant)],
        ["PatientDetail", "/patient/:id", t("Bemor tafsilotlari", variant)],
        ["Patients", "/patients", t("Bemorlar ro'yxati", variant)],
        ["Analytics", "/analytics", t("Statistik tahlil", variant)],
        ["Reports", "/reports", t("PDF hisobotlar", variant)],
        ["Alerts", "/alerts", t("Ogohlantirishlar", variant)],
        ["Medications", "/medications", t("Dori vositalari", variant)],
        ["AddPatient", "/add-patient", t("Yangi bemor qo'shish", variant)],
        ["Compare", "/compare", t("Bemorlarni solishtirish", variant)],
      ],
      [70, 80, '*'],
    ),

    sub(t("Holat boshqaruvi (State Management)", variant)),
    p(t("Loyihada server holati TanStack Query orqali boshqariladi. Har bir ma'lumot turi uchun alohida hook yaratilgan:", variant)),
    bullets([
      t("usePatients — bemorlar ro'yxati va qidirish", variant),
      t("useLabs — laboratoriya natijalari CRUD", variant),
      t("useMedications — dori vositalari boshqaruvi", variant),
      t("useRisk — risk hisoblash va snapshot", variant),
      t("useAlerts — ogohlantirishlar boshqaruvi", variant),
      t("usePrediction — AI bashorat so'rovlari", variant),
      t("useAuth — autentifikatsiya holati va rol boshqaruvi", variant),
    ]),

    /* ═══ 7 ═══ */
    section(7, t("BACKEND TUZILISHI (LOVABLE CLOUD)", variant)),
    sub(t("Backend xizmatlari", variant)),
    table(
      [t("Xizmat", variant), t("Vazifasi", variant), t("Texnologiya", variant)],
      [
        [t("Ma'lumotlar bazasi", variant), t("PostgreSQL 15 — relyatsion ma'lumotlar", variant), "PostgREST API"],
        [t("Autentifikatsiya", variant), t("Email/parol asosida foydalanuvchi boshqaruvi", variant), "GoTrue"],
        ["Edge Functions", t("Serverless API endpointlar (Deno)", variant), "Deno Runtime"],
        [t("Fayl saqlash", variant), t("Laboratoriya hisobotlari (PDF/rasm)", variant), "S3-compat Storage"],
        ["Realtime", t("Jonli ma'lumot yangilanishlari", variant), "WebSocket"],
      ],
    ),

    sub(t("Edge Functions ro'yxati", variant)),
    table(
      [t("Funksiya", variant), t("Vazifasi", variant), t("AI modeli", variant), "Rate limit"],
      [
        ["predict-rejection", t("Graft rad etish xavfini bashorat qilish", variant), "Gemini 3 Flash", "10/5min"],
        ["ocr-lab-report", t("Laboratoriya hisobotini OCR skanerlash", variant), "Gemini 2.5 Flash", "5/5min"],
        ["translate-text", t("Matnni tarjima qilish", variant), "Gemini 2.5 Flash Lite", "20/min"],
        ["recalculate-risk", t("Risk balini qayta hisoblash", variant), "Gemini 2.5 Flash", "10/5min"],
        ["system-health", t("Tizim holati tekshiruvi", variant), "—", "—"],
      ],
    ),

    sub(t("Autentifikatsiya oqimi", variant)),
    bullets([
      t("Foydalanuvchi email va parol bilan ro'yxatdan o'tadi", variant),
      t("Email tasdiqlash xati yuboriladi (auto-confirm o'chirilgan)", variant),
      t("Emailni tasdiqlash → tizimga kirish → rol tanlash", variant),
      t("Rol user_roles jadvaliga saqlanadi (xavfsiz, alohida jadval)", variant),
      t("JWT token har bir API so'rovda yuboriladi", variant),
      t("RLS siyosatlari orqali ma'lumotlarga kirish nazorat qilinadi", variant),
    ]),

    /* ═══ 8 ═══ */
    section(8, t("MA'LUMOTLAR BAZASI DIZAYNI", variant)),
    sub(t("Jadvallar ro'yxati (13 ta)", variant)),
    table(
      [t("Jadval nomi", variant), t("Taxminiy qatorlar", variant), t("Vazifasi", variant)],
      [
        ["patients", "~100+", t("Bemorlar — asosiy jadval", variant)],
        ["lab_results", "~500+", t("Laboratoriya natijalari (30+ parametr)", variant)],
        ["medications", "~200+", t("Dori vositalari", variant)],
        ["medication_adherence", "~1000+", t("Dori iste'mol kuzatuvi", variant)],
        ["medication_changes", "~100+", t("Dozaj o'zgarishlari tarixi", variant)],
        ["risk_snapshots", "~500+", t("Risk hisoblash tarixi", variant)],
        ["patient_alerts", "~300+", t("Ogohlantirishlar", variant)],
        ["patient_events", "~500+", t("Bemor hodisalari logi", variant)],
        ["lab_schedules", "~200+", t("Laboratoriya jadvallari", variant)],
        ["clinical_thresholds", "~50+", t("Klinik chegaralar (KDIGO/BANFF)", variant)],
        ["transplant_episodes", "~50+", t("Transplant episodlari (ko'p operatsiya tarixi)", variant)],
        ["audit_logs", "~1000+", t("Tizim audit loglari", variant)],
        ["user_roles", "~50+", t("Foydalanuvchi rollari", variant)],
      ],
      [80, 60, '*'],
    ),

    sub(t("Asosiy bog'lanishlar", variant)),
    bullets([
      "patients (1) → lab_results (N) — patient_id FK",
      "patients (1) → medications (N) — patient_id FK",
      "patients (1) → risk_snapshots (N) — patient_id FK",
      "patients (1) → patient_alerts (N) — patient_id FK",
      "patients (1) → patient_events (N) — patient_id FK",
      "patients (1) → lab_schedules (N) — patient_id FK",
      "patients (1) → transplant_episodes (N) — patient_id FK",
      "patients (1) → medication_changes (N) — patient_id FK",
      "medications (1) → medication_adherence (N) — medication_id FK",
      "medications (1) → medication_changes (N) — medication_id FK",
      "lab_results (1) → risk_snapshots (1) — lab_result_id FK",
      "lab_results (1) → lab_schedules (0..1) — completed_lab_id FK",
      "risk_snapshots (1) → patient_alerts (0..N) — risk_snapshot_id FK",
    ]),

    sub(t("Saqlangan protseduralar (Functions)", variant)),
    table(
      [t("Nomi", variant), t("Turi", variant), t("Vazifasi", variant)],
      [
        ["insert_lab_and_recalculate", "SECURITY DEFINER", t("Lab kiritish + risk qayta hisoblash (atom tranzaksiya)", variant)],
        ["generate_lab_schedule", "SECURITY DEFINER", t("Transplant sanasi bo'yicha jadval generatsiyasi", variant)],
        ["has_role", "SECURITY DEFINER", t("RLS uchun rol tekshiruvi (rekursiyasiz)", variant)],
        ["register_patient_self", "SECURITY DEFINER", t("Bemor o'zi ro'yxatdan o'tishi + telefon bo'yicha bog'lash", variant)],
        ["normalize_phone", "IMMUTABLE", t("Telefon raqamini +998... formatiga standartlashtirish", variant)],
        ["validate_role_assignment", "SECURITY DEFINER", t("Admin bo'lmasa doctor/admin rol berish taqiqlanadi", variant)],
        ["update_updated_at_column", "Function", t("updated_at ustunini avtomatik yangilash", variant)],
      ],
    ),

    sub(t("Triggerlar (14 ta)", variant)),
    table(
      [t("Trigger nomi", variant), t("Jadval", variant), t("Vazifasi", variant)],
      [
        ["sync_patient_risk_from_snapshot", "risk_snapshots", t("Risk snapshot qo'shilganda bemorning risk_level ni yangilash", variant)],
        ["check_lab_abnormal_and_alert", "lab_results", t("Lab natija kiritilganda klinik chegaralarga qarab avtomatik alert yaratish", variant)],
        ["normalize_patient_phone", "patients", t("Bemor telefonini INSERT/UPDATE da normalizatsiya qilish", variant)],
        ["trg_generate_lab_schedule", "patients", t("Transplant sanasi kiritilganda lab jadvali generatsiya qilish", variant)],
        ["notify_medication_change", "medication_changes", t("Dozaj o'zgartirilganda bemorga alert yuborish", variant)],
        ["check_medication_adherence_alert", "medication_adherence", t("2+ kun dori qabul qilinmasa ogohlantirish yaratish", variant)],
        ["validate_role_assignment", "user_roles", t("Admin bo'lmagan foydalanuvchi yuqori rol olishini taqiqlash", variant)],
        ["update_updated_at (patients)", "patients", t("updated_at ustunini avtomatik yangilash", variant)],
        ["update_updated_at (medications)", "medications", t("updated_at ustunini avtomatik yangilash", variant)],
        ["update_updated_at (lab_schedules)", "lab_schedules", t("updated_at ustunini avtomatik yangilash", variant)],
        ["update_updated_at (transplant_episodes)", "transplant_episodes", t("updated_at ustunini avtomatik yangilash", variant)],
      ],
      [100, 80, '*'],
    ),

    /* ═══ 9 ═══ */
    section(9, t("SUN'IY INTELLEKT IMKONIYATLARI", variant)),
    sub(t("AI integratsiya arxitekturasi", variant)),
    p(t("Tizim Lovable AI Gateway orqali Google Gemini va OpenAI modellariga ulanadi. API kaliti server tomonida saqlanadi, klient faqat Edge Functions ga so'rov yuboradi.", variant)),

    table(
      [t("Funksiya", variant), "Model", t("Kirish", variant), t("Chiqish", variant)],
      [
        [t("Graft rad bashorati", variant), "Gemini 3 Flash", t("Lab trendlari + qon guruhi", variant), t("Risk daraja + sabab + vaqt", variant)],
        [t("OCR skanerlash", variant), "Gemini 2.5 Flash", t("PDF/rasm (base64)", variant), t("Strukturalangan lab natijalar", variant)],
        [t("Tarjima", variant), "Gemini 2.5 Flash Lite", t("Matn + maqsad til", variant), t("Tarjima qilingan matn", variant)],
        [t("Risk qayta hisoblash", variant), "Gemini 2.5 Flash", t("Lab + klinik chegaralar", variant), t("Risk ball + bayroqlar", variant)],
      ],
    ),

    sub(t("AI bashorat tafsilotlari", variant)),
    bullets([
      t("Tool Calling: AI strukturalangan javob qaytarishi uchun function calling ishlatiladi", variant),
      t("Jigar transplanti: ALT, AST, Tacrolimus, Bilirubin, GGT, ALP trend tahlili", variant),
      t("Buyrak transplanti: Kreatinin, eGFR, Proteinuriya, Kaliy trend tahlili", variant),
      t("Qon guruhi mos kelmasligi — AMR (Antibody-Mediated Rejection) xavfini oshiradi", variant),
      t("Ogohlantirish: Barcha AI natijalar «Shifokor tomonidan tekshirilishi shart» izohi bilan chiqadi", variant),
    ]),

    /* ═══ 10 ═══ */
    section(10, t("ASOSIY TIZIM FUNKSIYALARI", variant)),
    sub(t("Bemorlarni boshqarish", variant)),
    bullets([
      t("Bemor ro'yxatga olish: ism, tug'ilgan sana, jins, viloyat, tuman, organ turi", variant),
      t("Qon guruhi va donor qon guruhi, titer terapiya holati", variant),
      t("Transplant tarixi: sana, raqam, dializ tarixi", variant),
      t("Bemorlarni qidirish, filtrlash va saralash", variant),
    ]),

    sub(t("Laboratoriya natijalari", variant)),
    bullets([
      t("30+ parametr qo'llab-quvvatlanadi (kreatinin, ALT, AST, tacrolimus va boshqalar)", variant),
      t("Qo'lda kiritish yoki OCR orqali avtomatik raqamlashtirish", variant),
      t("Trend grafiklari (Recharts) — vaqt bo'yicha parametr o'zgarishi", variant),
      t("Natijalar tarixini jadval va grafik ko'rinishida ko'rish", variant),
    ]),

    sub(t("Risk tahlili", variant)),
    bullets([
      t("Algoritmik risk hisoblash: klinik chegaralar + trend tahlili", variant),
      t("AI bashorat: graft rad etish ehtimoli (7–14 kun)", variant),
      t("Risk snapshotlar tarixi — vaqt bo'yicha risk o'zgarishini kuzatish", variant),
      t("Ustuvorlik paneli: eng yuqori riskli bemorlar birinchi", variant),
    ]),

    sub(t("Ogohlantirishlar", variant)),
    bullets([
      t("Muhim lab parametrlari oshganda avtomatik ogohlantirishlar", variant),
      t("Muddati o'tgan laboratoriya jadvallari haqida eslatmalar", variant),
      t("O'qilmagan ogohlantirishlar soni — bosh sahifada ko'rsatiladi", variant),
    ]),

    sub(t("Dori vositalari nazorati", variant)),
    bullets([
      t("Dori qo'shish, dozaj o'zgartirish, to'xtatish", variant),
      t("Dozaj o'zgarishlari tarixi (kim, qachon, nima uchun)", variant),
      t("Iste'mol kuzatuvi (adherence tracking)", variant),
    ]),

    sub(t("Hisobotlar", variant)),
    bullets([
      t("Oylik reeystr, choraklik statistika, dori iste'moli, hudud tahlili", variant),
      t("Klient tomonida PDF generatsiya (jsPDF — hisobotlar, pdfMake — texnik hujjat)", variant),
    ]),

    /* ═══ 11 ═══ */
    section(11, t("XAVFSIZLIK", variant)),
    sub(t("Autentifikatsiya", variant)),
    bullets([
      t("Email + parol asosida ro'yxatdan o'tish va kirish", variant),
      t("Email tasdiqlash majburiy (auto-confirm o'chirilgan)", variant),
      t("JWT tokenlar — har bir API so'rovda Authorization header", variant),
      t("Sessiya muddati tugashi (session timeout) — useSessionTimeout hook", variant),
    ]),

    sub(t("Avtorizatsiya (RBAC)", variant)),
    bullets([
      t("4 ta rol: admin, doctor, patient, support", variant),
      t("Rollar alohida user_roles jadvalida (privilege escalation himoyasi)", variant),
      t("has_role() funksiyasi — SECURITY DEFINER (RLS rekursiyasiz)", variant),
      t("Frontend: ProtectedRoute, DoctorOrAdminRoute komponentlari", variant),
    ]),

    sub("Row Level Security (RLS)"),
    p(t("Barcha jadvallarda RLS yoqilgan. Har bir jadval uchun SELECT, INSERT, UPDATE, DELETE siyosatlari mavjud. Shifokor faqat o'ziga biriktirilgan bemorlarni ko'radi, admin barcha ma'lumotlarga kira oladi.", variant)),

    sub(t("API xavfsizligi", variant)),
    bullets([
      t("Rate limiting: barcha Edge Functions uchun foydalanuvchi asosida cheklov", variant),
      t("CORS: faqat ruxsat berilgan domenlardan so'rovlar qabul qilinadi", variant),
      t("Storage RLS: fayl egasi, biriktirilgan shifokor yoki admin faqat kira oladi", variant),
      t("Audit log: muhim harakatlar audit_logs jadvaliga yoziladi", variant),
    ]),

    /* ═══ 12 ═══ */
    section(12, t("ISHLASH SAMARADORLIGI VA MASSHTABLASH", variant)),
    sub(t("Frontend optimizatsiya", variant)),
    bullets([
      t("Code splitting: React.lazy() — sahifalar alohida yuklanadi", variant),
      t("TanStack Query keshlash: staleTime 2 daqiqa, gcTime 10 daqiqa", variant),
      t("Refetch on window focus — foydalanuvchi qaytganda yangilanadi", variant),
      t("Skeleton loading — ma'lumot yuklanayotganda placeholder", variant),
    ]),

    sub(t("Backend optimizatsiya", variant)),
    bullets([
      t("insert_lab_and_recalculate — bitta tranzaksiyada lab + risk", variant),
      t("Indekslar: patient_id va recorded_at ustunlarida avtomatik indeks", variant),
      t("Edge Functions: cold start minimal (Deno lightweight runtime)", variant),
      t("Rate limiting: AI funksiyalarga suiste'molni oldini olish", variant),
    ]),

    sub(t("Masshtablash strategiyasi", variant)),
    bullets([
      t("Gorizontal: Edge Functions avtomatik masshtablanadi", variant),
      t("Vertikal: PostgreSQL connection pooling (PgBouncer)", variant),
      t("Ma'lumot: sahifalash (pagination) va limit qo'llaniladi (standart 1000 qator)", variant),
    ]),

    /* ═══ 13 ═══ */
    section(13, t("LOYIHANING JORIY HOLATI", variant)),
    sub(t("Tugallangan modullar (~92%)", variant)),
    table(
      [t("Modul", variant), t("Holat", variant), t("Tayyor %", variant)],
      [
        [t("Autentifikatsiya va RBAC", variant), t("Tugallangan", variant), "100%"],
        [t("Bemorlarni boshqarish", variant), t("Tugallangan", variant), "100%"],
        [t("Laboratoriya natijalari", variant), t("Tugallangan", variant), "100%"],
        [t("Risk tahlili", variant), t("Tugallangan", variant), "95%"],
        [t("AI bashorat", variant), t("Tugallangan", variant), "95%"],
        [t("OCR skanerlash", variant), t("Tugallangan", variant), "90%"],
        [t("Dori vositalari", variant), t("Tugallangan", variant), "95%"],
        [t("Ogohlantirishlar", variant), t("Tugallangan", variant), "90%"],
        [t("Hisobotlar (PDF)", variant), t("Tugallangan", variant), "90%"],
        [t("Ko'p tilli interfeys", variant), t("Tugallangan", variant), "85%"],
        [t("Realtime yangilanishlar", variant), t("Tugallangan", variant), "90%"],
        ["Audit logging", t("Tugallangan", variant), "80%"],
      ],
      [100, 70, '*'],
    ),

    sub(t("Rejalashtirilgan yaxshilanishlar", variant)),
    bullets([
      t("Bemor mobil ilovasi (PWA yoki React Native)", variant),
      t("SMS/Telegram ogohlantirishlar integratsiyasi", variant),
      t("Kengaytirilgan analitika dashboard", variant),
      t("Chet el klinikalari bilan o'zaro ishlash (FHIR/HL7)", variant),
    ]),

    /* ═══ 14 ═══ */
    section(14, t("KELAJAKDAGI RIVOJLANISH", variant)),
    p(t("TransplantCare platformasi kelajakda quyidagi tibbiy yo'nalishlarga kengaytirilishi rejalashtirilgan:", variant)),
    table(
      [t("Modul", variant), t("Maqsad", variant), t("Ustuvorlik", variant)],
      [
        [t("Onkologiya", variant), t("Saraton bemorlarini kuzatish, kimyoterapiya nazorati", variant), t("Yuqori", variant)],
        [t("Kardiologiya", variant), t("Yurak kasalliklari, EKG tahlili, stent kuzatuvi", variant), t("O'rta", variant)],
        [t("Ortopediya", variant), t("Suyak-bo'g'im operatsiyalari, reabilitatsiya kuzatuvi", variant), t("Past", variant)],
        [t("Urologiya", variant), t("Buyrak tosh kasalligi, dializ boshqaruvi", variant), t("O'rta", variant)],
        [t("Pediatriya", variant), t("Bolalar transplantatsiyasi — maxsus dozaj hisoblash", variant), t("Yuqori", variant)],
      ],
    ),

    /* ═══ 15 ═══ */
    section(15, t("YAKUNIY XULOSA", variant)),
    p(t("TransplantCare — O'zbekistonda transplant tibbiyotini raqamlashtirish yo'lida muhim qadam. Tizim zamonaviy veb texnologiyalar (React, TypeScript, Lovable Cloud) va sun'iy intellekt (Google Gemini) ni birlashtirib, shifokorlarga quyidagi imkoniyatlarni taqdim etadi:", variant)),
    bullets([
      t("Bemorlarni markazlashtirilgan holda boshqarish va laboratoriya natijalarini kuzatish", variant),
      t("AI yordamida graft rad etish xavfini 7–14 kun oldin bashorat qilish", variant),
      t("Immunosupressiv dorilar dozasini aniq nazorat qilish", variant),
      t("Muhim parametrlar oshganda darhol ogohlantirishlar olish", variant),
      t("OCR orqali qog'oz hisobotlarni raqamlashtirish", variant),
      t("Xavfsiz, masshtablanadigan va kengaytiriladigan arxitektura", variant),
    ]),
    {
      table: {
        widths: ['*'],
        body: [[{
          stack: [
            { text: t("Tizim haqiqiy tibbiy muhitda qo'llanilishga tayyor.", variant), bold: true, fontSize: 10, color: NAVY, alignment: 'center', margin: [0, 5, 0, 3] },
            { text: t("Tibbiy ma'lumotlar maxfiyligini ta'minlash uchun barcha xavfsizlik choralari joriy etilgan (RLS, RBAC, rate limiting, audit log).", variant), fontSize: 9, color: DARK, alignment: 'center', margin: [0, 0, 0, 5] },
          ],
        }]],
      },
      layout: { fillColor: () => LIGHT_BLUE, hLineColor: () => BLUE, vLineColor: () => BLUE },
      margin: [0, 15, 0, 0] as [number, number, number, number],
    },
  ];

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    content,
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `TransplantCare ${t("Texnik hujjat", variant)}  •  ${variantLabel}`, fontSize: 7, color: GREY, margin: [40, 10, 0, 0] },
        { text: `${t("Sahifa", variant)} ${currentPage}/${pageCount}`, fontSize: 7, color: GREY, alignment: 'right', margin: [0, 10, 40, 0] },
      ],
    }),
    defaultStyle: { font: 'Roboto', fontSize: 9, color: DARK },
    styles: {},
  };

  const fileName = lang !== 'uz' ? `TransplantCare_Technical_Document_${lang}.pdf` : variant === 'lat'
    ? 'TransplantCare_Texnik_Hujjat_Lotin.pdf'
    : 'TransplantCare_Техник_Ҳужжат_Кирил.pdf';

  (pdfMake as any).createPdf(docDefinition).download(fileName);
}

/* ════════════════ REACT SAHIFA ════════════════ */
export default function DocumentationPDF() {
  const { lang } = useLanguage();
  const tx = useTx();
  const [statusLat, setStatusLat] = useState<"idle" | "generating" | "done">("idle");
  const [statusCyr, setStatusCyr] = useState<"idle" | "generating" | "done">("idle");

  const handleGenerate = async (variant: Variant) => {
    const setStatus = variant === 'lat' ? setStatusLat : setStatusCyr;
    setStatus("generating");
    try {
      await generateDoc(variant, lang);
      setStatus("done");
    } catch (e) {
      console.error("PDF generation error:", e);
      setStatus("idle");
    }
  };

  const renderButton = (variant: Variant, status: "idle" | "generating" | "done", label: string, sublabel: string) => (
    <div className="flex flex-col items-center gap-2 w-full">
      <Button
        size="lg"
        className="w-full gap-2"
        variant={variant === 'cyr' ? 'outline' : 'default'}
        onClick={() => handleGenerate(variant)}
        disabled={status === "generating"}
      >
        {status === "generating" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {tx("Generating...")}
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle className="h-5 w-5" />
            {tx("Ready! Download again")}
          </>
        ) : (
          <>
            <FileDown className="h-5 w-5" />
            {label}
          </>
        )}
      </Button>
      <span className="text-xs text-muted-foreground">{sublabel}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-10 shadow-lg max-w-md w-full">
        <div className="rounded-full bg-primary/10 p-4">
          <Languages className="h-10 w-10 text-primary" />
        </div>
        <LanguageSelector />
        <h1 className="text-2xl font-bold text-foreground text-center">
          {tx("TransplantCare Technical Document")}
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          {tx("Technical documentation — 15 sections with tables and diagrams in PDF format.")}
        </p>

        <div className="flex flex-col gap-4 w-full">
          {renderButton('lat', statusLat, lang === "uz" ? tx("Download in Latin alphabet") : tx("Download PDF"), lang === "uz" ? "O'zbek" : lang === "ru" ? "Русский" : "English")}
          {lang === "uz" && renderButton('cyr', statusCyr, tx("Download in Cyrillic alphabet"), "O'zbek — kirill")}
        </div>

        {(statusLat === "done" || statusCyr === "done") && (
          <p className="text-xs text-green-600">
            ✅ {tx("File downloaded successfully!")}
          </p>
        )}
      </div>
    </div>
  );
}
