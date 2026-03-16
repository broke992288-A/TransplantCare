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

async function generateDoc(variant: Variant) {
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

  const today = new Date().toLocaleDateString('uz-UZ');
  const variantLabel = variant === 'lat' ? 'Lotin alifbosi' : 'Кирил алифбоси';

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
    section(1, "LOYIHA HAQIDA UMUMIY MA'LUMOT"),
    sub("Loyiha nomi va maqsadi"),
    p("TransplantCare — bu transplant (ko'chirma) operatsiyasi o'tkazilgan bemorlarni kompleks kuzatish, laboratoriya natijalarini tahlil qilish, dori vositalarini nazorat qilish va sun'iy intellekt yordamida graft rad etish xavfini bashorat qilish uchun yaratilgan zamonaviy tibbiy axborot tizimi."),

    sub("Qanday tibbiy muammolarni hal qiladi"),
    bullets([
      "Transplant bemorlarining laboratoriya natijalarini muntazam kuzatish va trend tahlili",
      "Graft rad etish xavfini erta bosqichda aniqlash (AI bashorat)",
      "Immunosupressiv dorilar dozasini nazorat qilish va o'zgarishlar tarixini saqlash",
      "Shifokor va bemor o'rtasidagi aloqani yaxshilash (ogohlantirishlar tizimi)",
      "OCR orqali laboratoriya hisobotlarini avtomatik raqamlashtirish",
      "Ko'p tilli interfeys (o'zbek, rus, ingliz)",
    ]),

    sub("Maqsadli foydalanuvchilar"),
    table(
      ["Foydalanuvchi", "Rol", "Asosiy funksiyalar"],
      [
        ["Shifokorlar", "doctor", "Bemorlarni boshqarish, tahlil kiritish, risk baholash"],
        ["Bemorlar", "patient", "O'z natijalarini ko'rish, dori jadvalini kuzatish"],
        ["Administratorlar", "admin", "Barcha funksiyalar + tizim sozlamalari"],
        ["Qo'llab-quvvatlash", "support", "Faqat ko'rish huquqi"],
      ],
    ),

    /* ═══ 2 ═══ */
    section(2, "TIZIM MAQSADI"),
    p("TransplantCare tizimining asosiy missiyasi — O'zbekistonda transplant tibbiyotini raqamlashtirish va bemorlar sog'lig'ini samarali kuzatish imkoniyatini yaratish. Tizim quyidagi tibbiy ish jarayonlarini qo'llab-quvvatlaydi:"),
    bullets([
      "Bemor ro'yxatga olish va demografik ma'lumotlarni saqlash (viloyat, tuman, qon guruhi)",
      "Laboratoriya natijalarini kiritish, OCR orqali skanerlash va avtomatik saqlash",
      "Risk darajasini hisoblash: laboratoriya trendlari + klinik chegaralar + AI bashorat",
      "Ogohlantirishlar: muhim parametrlar oshganda shifokorga darhol xabar berish",
      "Dori vositalari nazorati: dozaj o'zgarishlari tarixi, iste'mol kuzatuvi",
      "Hisobotlar: oylik, choraklik, hudud bo'yicha PDF hisobotlar generatsiya qilish",
    ]),

    /* ═══ 3 ═══ */
    section(3, "TIZIM ARXITEKTURASI"),
    sub("Umumiy arxitektura"),
    p("Tizim uch qatlamli arxitekturaga asoslangan: foydalanuvchi brauzeri (React frontend), Lovable Cloud backend (PostgreSQL, Auth, Edge Functions) va AI Gateway (Google Gemini, OpenAI)."),
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
            { text: "PostgreSQL DB\n(12 " + t("jadval", variant) + ")", alignment: 'center', fontSize: 8, fillColor: '#E8F5E9', margin: [0, 5, 0, 5] },
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

    sub("Frontend arxitekturasi"),
    bullets([
      "React 18 + TypeScript — komponentlarga asoslangan SPA",
      "Vite — tezkor build va HMR (Hot Module Replacement)",
      "React Router v6 — marshrut boshqaruvi, himoyalangan yo'nalishlar",
      "TanStack Query (React Query) — server holat boshqaruvi, keshlash",
    ]),

    sub("Backend arxitekturasi"),
    bullets([
      "Lovable Cloud — PostgreSQL, Auth, Storage, Edge Functions",
      "Edge Functions — Deno muhitida ishlovchi serverless funksiyalar",
      "RLS (Row Level Security) — ma'lumotlar bazasi darajasida xavfsizlik",
      "Realtime — o'zgarishlarni jonli kuzatish (WebSocket)",
    ]),

    /* ═══ 4 ═══ */
    section(4, "TEXNOLOGIYA STEKI"),
    table(
      ["Texnologiya", "Versiya", "Maqsad"],
      [
        ["React", "18.x", "UI komponentlar kutubxonasi"],
        ["TypeScript", "5.x", "Statik tipizatsiyali dasturlash tili"],
        ["Vite", "5.x", "Build va development server"],
        ["Tailwind CSS", "3.x", "Utility-first CSS freymvork"],
        ["shadcn/ui", "—", "Qayta foydalaniladigan UI komponentlar"],
        ["TanStack Query", "5.x", "Server holat boshqaruvi"],
        ["React Router", "6.x", "Marshrut boshqaruvi"],
        ["Zod", "3.x", "Ma'lumot validatsiya sxemalari"],
        ["Recharts", "2.x", "Grafik va diagrammalar"],
        ["jsPDF / pdfMake", "—", "PDF hisobotlar generatsiyasi"],
        ["Framer Motion", "—", "Animatsiya kutubxonasi"],
        ["Lovable Cloud", "—", "Backend (DB, Auth, Storage, Functions)"],
        ["Deno", "1.x", "Edge Functions muhiti"],
        ["Gemini AI", "2.5–3.x", "AI bashorat va OCR"],
        ["Vitest", "—", "Unit va integratsiya testlar"],
      ],
      [80, 50, '*'],
    ),

    /* ═══ 5 ═══ */
    section(5, "DASTURLASH TILLARI"),
    table(
      ["Til", "Qo'llanilish sohasi", "Ulushi"],
      [
        ["TypeScript", "Frontend komponentlar, hooklar, xizmatlar, Edge Functions", "~85%"],
        ["SQL", "Ma'lumotlar bazasi sxemalari, migratsiyalar, RLS siyosatlari, triggerlar", "~10%"],
        ["CSS", "Tailwind konfiguratsiya, global uslublar (index.css)", "~5%"],
      ],
      [60, '*', 40],
    ),
    p("Loyihaning asosiy dasturlash tili TypeScript bo'lib, u frontend va backend (Edge Functions) da bir xil foydalaniladi. Bu yagona til yondashuvi (full-stack TypeScript) kod sifatini va dasturchilar unumdorligini sezilarli oshiradi."),

    /* ═══ 6 ═══ */
    section(6, "FRONTEND TUZILISHI"),
    sub("Papka tuzilishi"),
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

    sub("Asosiy sahifalar"),
    table(
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
      [70, 80, '*'],
    ),

    sub("Holat boshqaruvi (State Management)"),
    p("Loyihada server holati TanStack Query orqali boshqariladi. Har bir ma'lumot turi uchun alohida hook yaratilgan:"),
    bullets([
      "usePatients — bemorlar ro'yxati va qidirish",
      "useLabs — laboratoriya natijalari CRUD",
      "useMedications — dori vositalari boshqaruvi",
      "useRisk — risk hisoblash va snapshot",
      "useAlerts — ogohlantirishlar boshqaruvi",
      "usePrediction — AI bashorat so'rovlari",
      "useAuth — autentifikatsiya holati va rol boshqaruvi",
    ]),

    /* ═══ 7 ═══ */
    section(7, "BACKEND TUZILISHI (LOVABLE CLOUD)"),
    sub("Backend xizmatlari"),
    table(
      ["Xizmat", "Vazifasi", "Texnologiya"],
      [
        ["Ma'lumotlar bazasi", "PostgreSQL 15 — relyatsion ma'lumotlar", "PostgREST API"],
        ["Autentifikatsiya", "Email/parol asosida foydalanuvchi boshqaruvi", "GoTrue"],
        ["Edge Functions", "Serverless API endpointlar (Deno)", "Deno Runtime"],
        ["Fayl saqlash", "Laboratoriya hisobotlari (PDF/rasm)", "S3-compat Storage"],
        ["Realtime", "Jonli ma'lumot yangilanishlari", "WebSocket"],
      ],
    ),

    sub("Edge Functions ro'yxati"),
    table(
      ["Funksiya", "Vazifasi", "AI modeli", "Rate limit"],
      [
        ["predict-rejection", "Graft rad etish xavfini bashorat qilish", "Gemini 3 Flash", "10/5min"],
        ["ocr-lab-report", "Laboratoriya hisobotini OCR skanerlash", "Gemini 2.5 Flash", "5/5min"],
        ["translate-text", "Matnni tarjima qilish", "Gemini 2.5 Flash Lite", "20/min"],
        ["recalculate-risk", "Risk balini qayta hisoblash", "Gemini 2.5 Flash", "10/5min"],
        ["system-health", "Tizim holati tekshiruvi", "—", "—"],
      ],
    ),

    sub("Autentifikatsiya oqimi"),
    bullets([
      "Foydalanuvchi email va parol bilan ro'yxatdan o'tadi",
      "Email tasdiqlash xati yuboriladi (auto-confirm o'chirilgan)",
      "Emailni tasdiqlash → tizimga kirish → rol tanlash",
      "Rol user_roles jadvaliga saqlanadi (xavfsiz, alohida jadval)",
      "JWT token har bir API so'rovda yuboriladi",
      "RLS siyosatlari orqali ma'lumotlarga kirish nazorat qilinadi",
    ]),

    /* ═══ 8 ═══ */
    section(8, "MA'LUMOTLAR BAZASI DIZAYNI"),
    sub("Jadvallar ro'yxati (12 ta)"),
    table(
      ["Jadval nomi", "Taxminiy qatorlar", "Vazifasi"],
      [
        ["patients", "~100+", "Bemorlar — asosiy jadval"],
        ["lab_results", "~500+", "Laboratoriya natijalari (30+ parametr)"],
        ["medications", "~200+", "Dori vositalari"],
        ["medication_adherence", "~1000+", "Dori iste'mol kuzatuvi"],
        ["medication_changes", "~100+", "Dozaj o'zgarishlari tarixi"],
        ["risk_snapshots", "~500+", "Risk hisoblash tarixi"],
        ["patient_alerts", "~300+", "Ogohlantirishlar"],
        ["patient_events", "~500+", "Bemor hodisalari logi"],
        ["lab_schedules", "~200+", "Laboratoriya jadvallari"],
        ["clinical_thresholds", "~50+", "Klinik chegaralar (KDIGO/BANFF)"],
        ["audit_logs", "~1000+", "Tizim audit loglari"],
        ["user_roles", "~50+", "Foydalanuvchi rollari"],
      ],
      [80, 60, '*'],
    ),

    sub("Asosiy bog'lanishlar"),
    bullets([
      "patients (1) → lab_results (N) — patient_id FK",
      "patients (1) → medications (N) — patient_id FK",
      "patients (1) → risk_snapshots (N) — patient_id FK",
      "patients (1) → patient_alerts (N) — patient_id FK",
      "medications (1) → medication_adherence (N) — medication_id FK",
      "lab_results (1) → risk_snapshots (1) — lab_result_id FK",
    ]),

    sub("Saqlangan protseduralar va triggerlar"),
    table(
      ["Nomi", "Turi", "Vazifasi"],
      [
        ["insert_lab_and_recalculate", "Function", "Lab kiritish + risk qayta hisoblash (tranzaksion)"],
        ["generate_lab_schedule", "Function", "Transplant sanasi bo'yicha jadval generatsiyasi"],
        ["has_role", "Function", "RLS uchun rol tekshiruvi (SECURITY DEFINER)"],
        ["register_patient_self", "Function", "Bemor o'zi ro'yxatdan o'tishi"],
        ["normalize_phone", "Function", "Telefon raqamini standartlashtirish"],
      ],
    ),

    /* ═══ 9 ═══ */
    section(9, "SUN'IY INTELLEKT IMKONIYATLARI"),
    sub("AI integratsiya arxitekturasi"),
    p("Tizim Lovable AI Gateway orqali Google Gemini va OpenAI modellariga ulanadi. API kaliti server tomonida saqlanadi, klient faqat Edge Functions ga so'rov yuboradi."),

    table(
      ["Funksiya", "Model", "Kirish", "Chiqish"],
      [
        ["Graft rad bashorati", "Gemini 3 Flash", "Lab trendlari + qon guruhi", "Risk daraja + sabab + vaqt"],
        ["OCR skanerlash", "Gemini 2.5 Flash", "PDF/rasm (base64)", "Strukturalangan lab natijalar"],
        ["Tarjima", "Gemini 2.5 Flash Lite", "Matn + maqsad til", "Tarjima qilingan matn"],
        ["Risk qayta hisoblash", "Gemini 2.5 Flash", "Lab + klinik chegaralar", "Risk ball + bayroqlar"],
      ],
    ),

    sub("AI bashorat tafsilotlari"),
    bullets([
      "Tool Calling: AI strukturalangan javob qaytarishi uchun function calling ishlatiladi",
      "Jigar transplanti: ALT, AST, Tacrolimus, Bilirubin, GGT, ALP trend tahlili",
      "Buyrak transplanti: Kreatinin, eGFR, Proteinuriya, Kaliy trend tahlili",
      "Qon guruhi mos kelmasligi — AMR (Antibody-Mediated Rejection) xavfini oshiradi",
      "Ogohlantirish: Barcha AI natijalar «Shifokor tomonidan tekshirilishi shart» izohi bilan chiqadi",
    ]),

    /* ═══ 10 ═══ */
    section(10, "ASOSIY TIZIM FUNKSIYALARI"),
    sub("Bemorlarni boshqarish"),
    bullets([
      "Bemor ro'yxatga olish: ism, tug'ilgan sana, jins, viloyat, tuman, organ turi",
      "Qon guruhi va donor qon guruhi, titer terapiya holati",
      "Transplant tarixi: sana, raqam, dializ tarixi",
      "Bemorlarni qidirish, filtrlash va saralash",
    ]),

    sub("Laboratoriya natijalari"),
    bullets([
      "30+ parametr qo'llab-quvvatlanadi (kreatinin, ALT, AST, tacrolimus va boshqalar)",
      "Qo'lda kiritish yoki OCR orqali avtomatik raqamlashtirish",
      "Trend grafiklari (Recharts) — vaqt bo'yicha parametr o'zgarishi",
      "Natijalar tarixini jadval va grafik ko'rinishida ko'rish",
    ]),

    sub("Risk tahlili"),
    bullets([
      "Algoritmik risk hisoblash: klinik chegaralar + trend tahlili",
      "AI bashorat: graft rad etish ehtimoli (7–14 kun)",
      "Risk snapshotlar tarixi — vaqt bo'yicha risk o'zgarishini kuzatish",
      "Ustuvorlik paneli: eng yuqori riskli bemorlar birinchi",
    ]),

    sub("Ogohlantirishlar"),
    bullets([
      "Muhim lab parametrlari oshganda avtomatik ogohlantirishlar",
      "Muddati o'tgan laboratoriya jadvallari haqida eslatmalar",
      "O'qilmagan ogohlantirishlar soni — bosh sahifada ko'rsatiladi",
    ]),

    sub("Dori vositalari nazorati"),
    bullets([
      "Dori qo'shish, dozaj o'zgartirish, to'xtatish",
      "Dozaj o'zgarishlari tarixi (kim, qachon, nima uchun)",
      "Iste'mol kuzatuvi (adherence tracking)",
    ]),

    sub("Hisobotlar"),
    bullets([
      "Oylik reeystr, choraklik statistika, dori iste'moli, hudud tahlili",
      "Klient tomonida PDF generatsiya (jsPDF / pdfMake)",
    ]),

    /* ═══ 11 ═══ */
    section(11, "XAVFSIZLIK"),
    sub("Autentifikatsiya"),
    bullets([
      "Email + parol asosida ro'yxatdan o'tish va kirish",
      "Email tasdiqlash majburiy (auto-confirm o'chirilgan)",
      "JWT tokenlar — har bir API so'rovda Authorization header",
      "Sessiya muddati tugashi (session timeout) — useSessionTimeout hook",
    ]),

    sub("Avtorizatsiya (RBAC)"),
    bullets([
      "4 ta rol: admin, doctor, patient, support",
      "Rollar alohida user_roles jadvalida (privilege escalation himoyasi)",
      "has_role() funksiyasi — SECURITY DEFINER (RLS rekursiyasiz)",
      "Frontend: ProtectedRoute, DoctorOrAdminRoute komponentlari",
    ]),

    sub("Row Level Security (RLS)"),
    p("Barcha jadvallarda RLS yoqilgan. Har bir jadval uchun SELECT, INSERT, UPDATE, DELETE siyosatlari mavjud. Shifokor faqat o'ziga biriktirilgan bemorlarni ko'radi, admin barcha ma'lumotlarga kira oladi."),

    sub("API xavfsizligi"),
    bullets([
      "Rate limiting: barcha Edge Functions uchun foydalanuvchi asosida cheklov",
      "CORS: faqat ruxsat berilgan domenlardan so'rovlar qabul qilinadi",
      "Storage RLS: fayl egasi, biriktirilgan shifokor yoki admin faqat kira oladi",
      "Audit log: muhim harakatlar audit_logs jadvaliga yoziladi",
    ]),

    /* ═══ 12 ═══ */
    section(12, "ISHLASH SAMARADORLIGI VA MASSHTABLASH"),
    sub("Frontend optimizatsiya"),
    bullets([
      "Code splitting: React.lazy() — sahifalar alohida yuklanadi",
      "TanStack Query keshlash: staleTime 2 daqiqa, gcTime 10 daqiqa",
      "Refetch on window focus — foydalanuvchi qaytganda yangilanadi",
      "Skeleton loading — ma'lumot yuklanayotganda placeholder",
    ]),

    sub("Backend optimizatsiya"),
    bullets([
      "insert_lab_and_recalculate — bitta tranzaksiyada lab + risk",
      "Indekslar: patient_id va recorded_at ustunlarida avtomatik indeks",
      "Edge Functions: cold start minimal (Deno lightweight runtime)",
      "Rate limiting: AI funksiyalarga suiste'molni oldini olish",
    ]),

    sub("Masshtablash strategiyasi"),
    bullets([
      "Gorizontal: Edge Functions avtomatik masshtablanadi",
      "Vertikal: PostgreSQL connection pooling (PgBouncer)",
      "Ma'lumot: sahifalash (pagination) va limit qo'llaniladi (standart 1000 qator)",
    ]),

    /* ═══ 13 ═══ */
    section(13, "LOYIHANING JORIY HOLATI"),
    sub("Tugallangan modullar (~92%)"),
    table(
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
      [100, 70, '*'],
    ),

    sub("Rejalashtirilgan yaxshilanishlar"),
    bullets([
      "Bemor mobil ilovasi (PWA yoki React Native)",
      "SMS/Telegram ogohlantirishlar integratsiyasi",
      "Kengaytirilgan analitika dashboard",
      "Chet el klinikalari bilan o'zaro ishlash (FHIR/HL7)",
    ]),

    /* ═══ 14 ═══ */
    section(14, "KELAJAKDAGI RIVOJLANISH"),
    p("TransplantCare platformasi kelajakda quyidagi tibbiy yo'nalishlarga kengaytirilishi rejalashtirilgan:"),
    table(
      ["Modul", "Maqsad", "Ustuvorlik"],
      [
        ["Onkologiya", "Saraton bemorlarini kuzatish, kimyoterapiya nazorati", "Yuqori"],
        ["Kardiologiya", "Yurak kasalliklari, EKG tahlili, stent kuzatuvi", "O'rta"],
        ["Ortopediya", "Suyak-bo'g'im operatsiyalari, reabilitatsiya kuzatuvi", "Past"],
        ["Urologiya", "Buyrak tosh kasalligi, dializ boshqaruvi", "O'rta"],
        ["Pediatriya", "Bolalar transplantatsiyasi — maxsus dozaj hisoblash", "Yuqori"],
      ],
    ),

    /* ═══ 15 ═══ */
    section(15, "YAKUNIY XULOSA"),
    p("TransplantCare — O'zbekistonda transplant tibbiyotini raqamlashtirish yo'lida muhim qadam. Tizim zamonaviy veb texnologiyalar (React, TypeScript, Lovable Cloud) va sun'iy intellekt (Google Gemini) ni birlashtirib, shifokorlarga quyidagi imkoniyatlarni taqdim etadi:"),
    bullets([
      "Bemorlarni markazlashtirilgan holda boshqarish va laboratoriya natijalarini kuzatish",
      "AI yordamida graft rad etish xavfini 7–14 kun oldin bashorat qilish",
      "Immunosupressiv dorilar dozasini aniq nazorat qilish",
      "Muhim parametrlar oshganda darhol ogohlantirishlar olish",
      "OCR orqali qog'oz hisobotlarni raqamlashtirish",
      "Xavfsiz, masshtablanadigan va kengaytiriladigan arxitektura",
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

  const fileName = variant === 'lat'
    ? 'TransplantCare_Texnik_Hujjat_Lotin.pdf'
    : 'TransplantCare_Техник_Ҳужжат_Кирил.pdf';

  (pdfMake as any).createPdf(docDefinition).download(fileName);
}

/* ════════════════ REACT SAHIFA ════════════════ */
export default function DocumentationPDF() {
  const [statusLat, setStatusLat] = useState<"idle" | "generating" | "done">("idle");
  const [statusCyr, setStatusCyr] = useState<"idle" | "generating" | "done">("idle");

  const handleGenerate = async (variant: Variant) => {
    const setStatus = variant === 'lat' ? setStatusLat : setStatusCyr;
    setStatus("generating");
    try {
      await generateDoc(variant);
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
            {variant === 'lat' ? "Yaratilmoqda..." : "Яратилмоқда..."}
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle className="h-5 w-5" />
            {variant === 'lat' ? "Tayyor! Qayta yuklash" : "Тайёр! Қайта юклаш"}
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
        <h1 className="text-2xl font-bold text-foreground text-center">
          TransplantCare Texnik Hujjat
        </h1>
        <p className="text-sm text-muted-foreground text-center">
          15 bo'limli to'liq texnik hujjatlashtirish — PDF formatda, rangli jadvallar va diagrammalar bilan.
        </p>

        <div className="flex flex-col gap-4 w-full">
          {renderButton('lat', statusLat, "Lotin alifbosida yuklab olish", "O'zbek tili — Lotin (a, b, c...)")}
          {renderButton('cyr', statusCyr, "Кирил алифбосида юклаб олиш", "Ўзбек тили — Кирил (а, б, в...)")}
        </div>

        {(statusLat === "done" || statusCyr === "done") && (
          <p className="text-xs text-green-600">
            ✅ Fayl muvaffaqiyatli yuklab olindi!
          </p>
        )}
      </div>
    </div>
  );
}
