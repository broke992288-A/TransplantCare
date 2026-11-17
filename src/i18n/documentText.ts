import type { Language } from "@/hooks/useLanguage";

const DOCUMENT_TEXT: Record<string, Record<Language, string>> = {
  "Lotin alifbosi": {
    "en": "Latin alphabet",
    "ru": "Латинский алфавит",
    "uz": "Lotin alifbosi"
  },
  "Кирил алифбоси": {
    "en": "Cyrillic alphabet",
    "ru": "Кириллический алфавит",
    "uz": "Кирил алифбоси"
  },
  "BO'LIM": {
    "en": "SECTION",
    "ru": "РАЗДЕЛ",
    "uz": "BO'LIM"
  },
  "Texnik hujjatlashtirish": {
    "en": "Technical documentation",
    "ru": "Техническая документация",
    "uz": "Texnik hujjatlashtirish"
  },
  "Transplant bemorlarini kuzatish va boshqarish tizimi": {
    "en": "Transplant patient monitoring and management system",
    "ru": "Система наблюдения и ведения пациентов после трансплантации",
    "uz": "Transplant bemorlarini kuzatish va boshqarish tizimi"
  },
  "To'liq texnik qo'llanma": {
    "en": "Complete technical guide",
    "ru": "Полное техническое руководство",
    "uz": "To'liq texnik qo'llanma"
  },
  "Versiya": {
    "en": "Version",
    "ru": "Версия",
    "uz": "Versiya"
  },
  "Sana": {
    "en": "Date",
    "ru": "Дата",
    "uz": "Sana"
  },
  "Maxfiylik darajasi: ICHKI FOYDALANISH UCHUN": {
    "en": "Confidentiality level: FOR INTERNAL USE",
    "ru": "Уровень конфиденциальности: ДЛЯ ВНУТРЕННЕГО ИСПОЛЬЗОВАНИЯ",
    "uz": "Maxfiylik darajasi: ICHKI FOYDALANISH UCHUN"
  },
  "MUNDARIJA": {
    "en": "CONTENTS",
    "ru": "СОДЕРЖАНИЕ",
    "uz": "MUNDARIJA"
  },
  "Loyiha haqida umumiy ma'lumot": {
    "en": "Project overview",
    "ru": "Общие сведения о проекте",
    "uz": "Loyiha haqida umumiy ma'lumot"
  },
  "Tizim maqsadi": {
    "en": "System purpose",
    "ru": "Назначение системы",
    "uz": "Tizim maqsadi"
  },
  "Tizim arxitekturasi": {
    "en": "System architecture",
    "ru": "Архитектура системы",
    "uz": "Tizim arxitekturasi"
  },
  "Texnologiya steki": {
    "en": "Technology stack",
    "ru": "Стек технологий",
    "uz": "Texnologiya steki"
  },
  "Dasturlash tillari": {
    "en": "Programming languages",
    "ru": "Языки программирования",
    "uz": "Dasturlash tillari"
  },
  "Frontend tuzilishi": {
    "en": "Frontend structure",
    "ru": "Структура frontend",
    "uz": "Frontend tuzilishi"
  },
  "Backend tuzilishi (Lovable Cloud)": {
    "en": "Backend structure (Lovable Cloud)",
    "ru": "Структура backend (Lovable Cloud)",
    "uz": "Backend tuzilishi (Lovable Cloud)"
  },
  "Ma'lumotlar bazasi dizayni": {
    "en": "Database design",
    "ru": "Проектирование базы данных",
    "uz": "Ma'lumotlar bazasi dizayni"
  },
  "Sun'iy intellekt imkoniyatlari": {
    "en": "Artificial intelligence capabilities",
    "ru": "Возможности искусственного интеллекта",
    "uz": "Sun'iy intellekt imkoniyatlari"
  },
  "Asosiy tizim funksiyalari": {
    "en": "Core system functions",
    "ru": "Основные функции системы",
    "uz": "Asosiy tizim funksiyalari"
  },
  "Xavfsizlik": {
    "en": "Security",
    "ru": "Безопасность",
    "uz": "Xavfsizlik"
  },
  "Ishlash samaradorligi va masshtablash": {
    "en": "Performance and scaling",
    "ru": "Производительность и масштабирование",
    "uz": "Ishlash samaradorligi va masshtablash"
  },
  "Loyihaning joriy holati": {
    "en": "Current project status",
    "ru": "Текущее состояние проекта",
    "uz": "Loyihaning joriy holati"
  },
  "Kelajakdagi rivojlanish": {
    "en": "Future development",
    "ru": "Дальнейшее развитие",
    "uz": "Kelajakdagi rivojlanish"
  },
  "Yakuniy xulosa": {
    "en": "Final conclusion",
    "ru": "Итоговое заключение",
    "uz": "Yakuniy xulosa"
  },
  "LOYIHA HAQIDA UMUMIY MA'LUMOT": {
    "en": "PROJECT OVERVIEW",
    "ru": "ОБЩИЕ СВЕДЕНИЯ О ПРОЕКТЕ",
    "uz": "LOYIHA HAQIDA UMUMIY MA'LUMOT"
  },
  "Loyiha nomi va maqsadi": {
    "en": "Project name and purpose",
    "ru": "Название и назначение проекта",
    "uz": "Loyiha nomi va maqsadi"
  },
  "TransplantCare — bu transplant (ko'chirma) operatsiyasi o'tkazilgan bemorlarni kompleks kuzatish, laboratoriya natijalarini tahlil qilish, dori vositalarini nazorat qilish va sun'iy intellekt yordamida graft rad etish xavfini bashorat qilish uchun yaratilgan zamonaviy tibbiy axborot tizimi.": {
    "en": "TransplantCare is a modern medical information system designed for comprehensive monitoring of patients who have undergone transplant surgery, analysis of laboratory results, medication monitoring, and prediction of graft rejection risk using artificial intelligence.",
    "ru": "TransplantCare — современная медицинская информационная система, созданная для комплексного наблюдения за пациентами, перенёсшими операцию по трансплантации (пересадке), анализа лабораторных результатов, контроля лекарственных средств и прогнозирования риска отторжения трансплантата с помощью искусственного интеллекта.",
    "uz": "TransplantCare — bu transplant (ko'chirma) operatsiyasi o'tkazilgan bemorlarni kompleks kuzatish, laboratoriya natijalarini tahlil qilish, dori vositalarini nazorat qilish va sun'iy intellekt yordamida graft rad etish xavfini bashorat qilish uchun yaratilgan zamonaviy tibbiy axborot tizimi."
  },
  "Qanday tibbiy muammolarni hal qiladi": {
    "en": "Medical problems addressed",
    "ru": "Какие медицинские проблемы решает",
    "uz": "Qanday tibbiy muammolarni hal qiladi"
  },
  "Transplant bemorlarining laboratoriya natijalarini muntazam kuzatish va trend tahlili": {
    "en": "Regular monitoring and trend analysis of transplant patients' laboratory results",
    "ru": "Регулярное наблюдение за лабораторными результатами пациентов после трансплантации и анализ динамики",
    "uz": "Transplant bemorlarining laboratoriya natijalarini muntazam kuzatish va trend tahlili"
  },
  "Graft rad etish xavfini erta bosqichda aniqlash (AI bashorat)": {
    "en": "Early detection of graft rejection risk (AI prediction)",
    "ru": "Раннее выявление риска отторжения трансплантата (прогноз AI)",
    "uz": "Graft rad etish xavfini erta bosqichda aniqlash (AI bashorat)"
  },
  "Immunosupressiv dorilar dozasini nazorat qilish va o'zgarishlar tarixini saqlash": {
    "en": "Monitoring immunosuppressive drug doses and retaining change history",
    "ru": "Контроль доз иммуносупрессивных препаратов и сохранение истории изменений",
    "uz": "Immunosupressiv dorilar dozasini nazorat qilish va o'zgarishlar tarixini saqlash"
  },
  "Shifokor va bemor o'rtasidagi aloqani yaxshilash (ogohlantirishlar tizimi)": {
    "en": "Improving communication between doctor and patient (alert system)",
    "ru": "Улучшение связи между врачом и пациентом (система оповещений)",
    "uz": "Shifokor va bemor o'rtasidagi aloqani yaxshilash (ogohlantirishlar tizimi)"
  },
  "OCR orqali laboratoriya hisobotlarini avtomatik raqamlashtirish": {
    "en": "Automatic digitization of laboratory reports using OCR",
    "ru": "Автоматическая оцифровка лабораторных отчётов с помощью OCR",
    "uz": "OCR orqali laboratoriya hisobotlarini avtomatik raqamlashtirish"
  },
  "Ko'p tilli interfeys (o'zbek, rus, ingliz)": {
    "en": "Multilingual interface (Uzbek, Russian, English)",
    "ru": "Многоязычный интерфейс (узбекский, русский, английский)",
    "uz": "Ko'p tilli interfeys (o'zbek, rus, ingliz)"
  },
  "Maqsadli foydalanuvchilar": {
    "en": "Target users",
    "ru": "Целевые пользователи",
    "uz": "Maqsadli foydalanuvchilar"
  },
  "Foydalanuvchi": {
    "en": "User",
    "ru": "Пользователь",
    "uz": "Foydalanuvchi"
  },
  "Rol": {
    "en": "Role",
    "ru": "Роль",
    "uz": "Rol"
  },
  "Asosiy funksiyalar": {
    "en": "Core functions",
    "ru": "Основные функции",
    "uz": "Asosiy funksiyalar"
  },
  "Shifokorlar": {
    "en": "Doctors",
    "ru": "Врачи",
    "uz": "Shifokorlar"
  },
  "Bemorlarni boshqarish, tahlil kiritish, risk baholash": {
    "en": "Patient management, entering test results, risk assessment",
    "ru": "Ведение пациентов, ввод результатов анализов, оценка риска",
    "uz": "Bemorlarni boshqarish, tahlil kiritish, risk baholash"
  },
  "Bemorlar": {
    "en": "Patients",
    "ru": "Пациенты",
    "uz": "Bemorlar"
  },
  "O'z natijalarini ko'rish, dori jadvalini kuzatish": {
    "en": "Viewing own results, tracking medication schedule",
    "ru": "Просмотр собственных результатов, отслеживание графика приёма лекарств",
    "uz": "O'z natijalarini ko'rish, dori jadvalini kuzatish"
  },
  "Administratorlar": {
    "en": "Administrators",
    "ru": "Администраторы",
    "uz": "Administratorlar"
  },
  "Barcha funksiyalar + tizim sozlamalari": {
    "en": "All functions + system settings",
    "ru": "Все функции + настройки системы",
    "uz": "Barcha funksiyalar + tizim sozlamalari"
  },
  "Qo'llab-quvvatlash": {
    "en": "Support",
    "ru": "Поддержка",
    "uz": "Qo'llab-quvvatlash"
  },
  "Faqat ko'rish huquqi": {
    "en": "View-only access",
    "ru": "Доступ только для просмотра",
    "uz": "Faqat ko'rish huquqi"
  },
  "TIZIM MAQSADI": {
    "en": "SYSTEM PURPOSE",
    "ru": "НАЗНАЧЕНИЕ СИСТЕМЫ",
    "uz": "TIZIM MAQSADI"
  },
  "TransplantCare tizimining asosiy missiyasi — O'zbekistonda transplant tibbiyotini raqamlashtirish va bemorlar sog'lig'ini samarali kuzatish imkoniyatini yaratish. Tizim quyidagi tibbiy ish jarayonlarini qo'llab-quvvatlaydi:": {
    "en": "The primary mission of TransplantCare is to digitize transplant medicine in Uzbekistan and enable effective monitoring of patients' health. The system supports the following clinical workflows:",
    "ru": "Основная миссия системы TransplantCare — цифровизация трансплантационной медицины в Узбекистане и создание возможностей для эффективного наблюдения за здоровьем пациентов. Система поддерживает следующие медицинские рабочие процессы:",
    "uz": "TransplantCare tizimining asosiy missiyasi — O'zbekistonda transplant tibbiyotini raqamlashtirish va bemorlar sog'lig'ini samarali kuzatish imkoniyatini yaratish. Tizim quyidagi tibbiy ish jarayonlarini qo'llab-quvvatlaydi:"
  },
  "Bemor ro'yxatga olish va demografik ma'lumotlarni saqlash (viloyat, tuman, qon guruhi)": {
    "en": "Patient registration and storage of demographic data (region, district, blood group)",
    "ru": "Регистрация пациентов и хранение демографических данных (область, район, группа крови)",
    "uz": "Bemor ro'yxatga olish va demografik ma'lumotlarni saqlash (viloyat, tuman, qon guruhi)"
  },
  "Laboratoriya natijalarini kiritish, OCR orqali skanerlash va avtomatik saqlash": {
    "en": "Entering laboratory results, scanning using OCR, and automatic saving",
    "ru": "Ввод лабораторных результатов, сканирование с помощью OCR и автоматическое сохранение",
    "uz": "Laboratoriya natijalarini kiritish, OCR orqali skanerlash va avtomatik saqlash"
  },
  "Risk darajasini hisoblash: laboratoriya trendlari + klinik chegaralar + AI bashorat": {
    "en": "Risk level calculation: laboratory trends + clinical thresholds + AI prediction",
    "ru": "Расчёт уровня риска: динамика лабораторных показателей + клинические пороговые значения + прогноз AI",
    "uz": "Risk darajasini hisoblash: laboratoriya trendlari + klinik chegaralar + AI bashorat"
  },
  "Ogohlantirishlar: muhim parametrlar oshganda shifokorga darhol xabar berish": {
    "en": "Alerts: immediate notification to the doctor when critical parameters rise",
    "ru": "Оповещения: немедленное уведомление врача при повышении важных показателей",
    "uz": "Ogohlantirishlar: muhim parametrlar oshganda shifokorga darhol xabar berish"
  },
  "Dori vositalari nazorati: dozaj o'zgarishlari tarixi, iste'mol kuzatuvi": {
    "en": "Medication monitoring: dose change history, intake tracking",
    "ru": "Контроль лекарственных средств: история изменений дозировки, отслеживание приёма",
    "uz": "Dori vositalari nazorati: dozaj o'zgarishlari tarixi, iste'mol kuzatuvi"
  },
  "Hisobotlar: oylik, choraklik, hudud bo'yicha PDF hisobotlar generatsiya qilish": {
    "en": "Reports: generation of monthly, quarterly, and regional PDF reports",
    "ru": "Отчёты: формирование ежемесячных, ежеквартальных и региональных отчётов в PDF",
    "uz": "Hisobotlar: oylik, choraklik, hudud bo'yicha PDF hisobotlar generatsiya qilish"
  },
  "TIZIM ARXITEKTURASI": {
    "en": "SYSTEM ARCHITECTURE",
    "ru": "АРХИТЕКТУРА СИСТЕМЫ",
    "uz": "TIZIM ARXITEKTURASI"
  },
  "Umumiy arxitektura": {
    "en": "Overall architecture",
    "ru": "Общая архитектура",
    "uz": "Umumiy arxitektura"
  },
  "Tizim uch qatlamli arxitekturaga asoslangan: foydalanuvchi brauzeri (React frontend), Lovable Cloud backend (PostgreSQL, Auth, Edge Functions) va AI Gateway (Google Gemini, OpenAI).": {
    "en": "The system is based on a three-tier architecture: the user's browser (React frontend), Lovable Cloud backend (PostgreSQL, Auth, Edge Functions), and AI Gateway (Google Gemini, OpenAI).",
    "ru": "Система основана на трёхуровневой архитектуре: браузер пользователя (React frontend), backend Lovable Cloud (PostgreSQL, Auth, Edge Functions) и AI Gateway (Google Gemini, OpenAI).",
    "uz": "Tizim uch qatlamli arxitekturaga asoslangan: foydalanuvchi brauzeri (React frontend), Lovable Cloud backend (PostgreSQL, Auth, Edge Functions) va AI Gateway (Google Gemini, OpenAI)."
  },
  "FOYDALANUVCHI\n(Brauzer)": {
    "en": "USER\n(Browser)",
    "ru": "ПОЛЬЗОВАТЕЛЬ\n(Браузер)",
    "uz": "FOYDALANUVCHI\n(Brauzer)"
  },
  "jadval": {
    "en": "tables",
    "ru": "таблиц",
    "uz": "jadval"
  },
  "Frontend arxitekturasi": {
    "en": "Frontend architecture",
    "ru": "Архитектура frontend",
    "uz": "Frontend arxitekturasi"
  },
  "React 18 + TypeScript — komponentlarga asoslangan SPA": {
    "en": "React 18 + TypeScript — component-based SPA",
    "ru": "React 18 + TypeScript — SPA на основе компонентов",
    "uz": "React 18 + TypeScript — komponentlarga asoslangan SPA"
  },
  "Vite — tezkor build va HMR (Hot Module Replacement)": {
    "en": "Vite — fast builds and HMR (Hot Module Replacement)",
    "ru": "Vite — быстрая сборка и HMR (Hot Module Replacement)",
    "uz": "Vite — tezkor build va HMR (Hot Module Replacement)"
  },
  "React Router v6 — marshrut boshqaruvi, himoyalangan yo'nalishlar": {
    "en": "React Router v6 — route management, protected routes",
    "ru": "React Router v6 — управление маршрутизацией, защищённые маршруты",
    "uz": "React Router v6 — marshrut boshqaruvi, himoyalangan yo'nalishlar"
  },
  "TanStack Query (React Query) — server holat boshqaruvi, keshlash": {
    "en": "TanStack Query (React Query) — server state management, caching",
    "ru": "TanStack Query (React Query) — управление серверным состоянием, кеширование",
    "uz": "TanStack Query (React Query) — server holat boshqaruvi, keshlash"
  },
  "Backend arxitekturasi": {
    "en": "Backend architecture",
    "ru": "Архитектура backend",
    "uz": "Backend arxitekturasi"
  },
  "Edge Functions — Deno muhitida ishlovchi serverless funksiyalar": {
    "en": "Edge Functions — serverless functions running in the Deno environment",
    "ru": "Edge Functions — бессерверные функции, работающие в среде Deno",
    "uz": "Edge Functions — Deno muhitida ishlovchi serverless funksiyalar"
  },
  "RLS (Row Level Security) — ma'lumotlar bazasi darajasida xavfsizlik": {
    "en": "RLS (Row Level Security) — database-level security",
    "ru": "RLS (Row Level Security) — безопасность на уровне базы данных",
    "uz": "RLS (Row Level Security) — ma'lumotlar bazasi darajasida xavfsizlik"
  },
  "Realtime — o'zgarishlarni jonli kuzatish (WebSocket)": {
    "en": "Realtime — live change monitoring (WebSocket)",
    "ru": "Realtime — отслеживание изменений в реальном времени (WebSocket)",
    "uz": "Realtime — o'zgarishlarni jonli kuzatish (WebSocket)"
  },
  "TEXNOLOGIYA STEKI": {
    "en": "TECHNOLOGY STACK",
    "ru": "СТЕК ТЕХНОЛОГИЙ",
    "uz": "TEXNOLOGIYA STEKI"
  },
  "Texnologiya": {
    "en": "Technology",
    "ru": "Технология",
    "uz": "Texnologiya"
  },
  "Maqsad": {
    "en": "Purpose",
    "ru": "Назначение",
    "uz": "Maqsad"
  },
  "UI komponentlar kutubxonasi": {
    "en": "UI component library",
    "ru": "Библиотека компонентов UI",
    "uz": "UI komponentlar kutubxonasi"
  },
  "Statik tipizatsiyali dasturlash tili": {
    "en": "Statically typed programming language",
    "ru": "Язык программирования со статической типизацией",
    "uz": "Statik tipizatsiyali dasturlash tili"
  },
  "Build va development server": {
    "en": "Build and development server",
    "ru": "Сборка и сервер разработки",
    "uz": "Build va development server"
  },
  "Utility-first CSS freymvork": {
    "en": "Utility-first CSS framework",
    "ru": "CSS-фреймворк с подходом utility-first",
    "uz": "Utility-first CSS freymvork"
  },
  "Qayta foydalaniladigan UI komponentlar": {
    "en": "Reusable UI components",
    "ru": "Повторно используемые компоненты UI",
    "uz": "Qayta foydalaniladigan UI komponentlar"
  },
  "Server holat boshqaruvi": {
    "en": "Server state management",
    "ru": "Управление серверным состоянием",
    "uz": "Server holat boshqaruvi"
  },
  "Marshrut boshqaruvi": {
    "en": "Route management",
    "ru": "Управление маршрутизацией",
    "uz": "Marshrut boshqaruvi"
  },
  "Ma'lumot validatsiya sxemalari": {
    "en": "Data validation schemas",
    "ru": "Схемы валидации данных",
    "uz": "Ma'lumot validatsiya sxemalari"
  },
  "Grafik va diagrammalar": {
    "en": "Charts and diagrams",
    "ru": "Графики и диаграммы",
    "uz": "Grafik va diagrammalar"
  },
  "PDF hisobotlar generatsiyasi": {
    "en": "PDF report generation",
    "ru": "Формирование отчётов PDF",
    "uz": "PDF hisobotlar generatsiyasi"
  },
  "Edge Functions muhiti": {
    "en": "Edge Functions environment",
    "ru": "Среда Edge Functions",
    "uz": "Edge Functions muhiti"
  },
  "AI bashorat va OCR": {
    "en": "AI prediction and OCR",
    "ru": "Прогнозирование AI и OCR",
    "uz": "AI bashorat va OCR"
  },
  "Unit va integratsiya testlar": {
    "en": "Unit and integration tests",
    "ru": "Модульные и интеграционные тесты",
    "uz": "Unit va integratsiya testlar"
  },
  "DASTURLASH TILLARI": {
    "en": "PROGRAMMING LANGUAGES",
    "ru": "ЯЗЫКИ ПРОГРАММИРОВАНИЯ",
    "uz": "DASTURLASH TILLARI"
  },
  "Til": {
    "en": "Language",
    "ru": "Язык",
    "uz": "Til"
  },
  "Qo'llanilish sohasi": {
    "en": "Area of application",
    "ru": "Область применения",
    "uz": "Qo'llanilish sohasi"
  },
  "Ulushi": {
    "en": "Share",
    "ru": "Доля",
    "uz": "Ulushi"
  },
  "Frontend komponentlar, hooklar, xizmatlar, Edge Functions": {
    "en": "Frontend components, hooks, services, Edge Functions",
    "ru": "Компоненты frontend, хуки, сервисы, Edge Functions",
    "uz": "Frontend komponentlar, hooklar, xizmatlar, Edge Functions"
  },
  "Ma'lumotlar bazasi sxemalari, migratsiyalar, RLS siyosatlari, triggerlar": {
    "en": "Database schemas, migrations, RLS policies, triggers",
    "ru": "Схемы базы данных, миграции, политики RLS, триггеры",
    "uz": "Ma'lumotlar bazasi sxemalari, migratsiyalar, RLS siyosatlari, triggerlar"
  },
  "Tailwind konfiguratsiya, global uslublar (index.css)": {
    "en": "Tailwind configuration, global styles (index.css)",
    "ru": "Конфигурация Tailwind, глобальные стили (index.css)",
    "uz": "Tailwind konfiguratsiya, global uslublar (index.css)"
  },
  "Loyihaning asosiy dasturlash tili TypeScript bo'lib, u frontend va backend (Edge Functions) da bir xil foydalaniladi. Bu yagona til yondashuvi (full-stack TypeScript) kod sifatini va dasturchilar unumdorligini sezilarli oshiradi.": {
    "en": "The project's main programming language is TypeScript, used consistently in both the frontend and backend (Edge Functions). This single-language approach (full-stack TypeScript) significantly improves code quality and developer productivity.",
    "ru": "Основной язык программирования проекта — TypeScript, который одинаково используется во frontend и backend (Edge Functions). Этот подход с единым языком (full-stack TypeScript) значительно повышает качество кода и производительность разработчиков.",
    "uz": "Loyihaning asosiy dasturlash tili TypeScript bo'lib, u frontend va backend (Edge Functions) da bir xil foydalaniladi. Bu yagona til yondashuvi (full-stack TypeScript) kod sifatini va dasturchilar unumdorligini sezilarli oshiradi."
  },
  "FRONTEND TUZILISHI": {
    "en": "FRONTEND STRUCTURE",
    "ru": "СТРУКТУРА FRONTEND",
    "uz": "FRONTEND TUZILISHI"
  },
  "Papka tuzilishi": {
    "en": "Folder structure",
    "ru": "Структура папок",
    "uz": "Papka tuzilishi"
  },
  "Biznes logika komponentlari (30+ fayl)": {
    "en": "Business logic components (30+ files)",
    "ru": "Компоненты бизнес-логики (30+ файлов)",
    "uz": "Biznes logika komponentlari (30+ fayl)"
  },
  "komponentlari (50+ fayl)": {
    "en": "components (50+ files)",
    "ru": "компоненты (50+ файлов)",
    "uz": "komponentlari (50+ fayl)"
  },
  "Custom React hooklar (15+ fayl)": {
    "en": "Custom React hooks (15+ files)",
    "ru": "Пользовательские хуки React (15+ файлов)",
    "uz": "Custom React hooklar (15+ fayl)"
  },
  "Sahifa komponentlari (15 sahifa)": {
    "en": "Page components (15 pages)",
    "ru": "Компоненты страниц (15 страниц)",
    "uz": "Sahifa komponentlari (15 sahifa)"
  },
  "xizmat qatlamlari (15+ fayl)": {
    "en": "service layers (15+ files)",
    "ru": "сервисные слои (15+ файлов)",
    "uz": "xizmat qatlamlari (15+ fayl)"
  },
  "Yordamchi funksiyalar": {
    "en": "Utility functions",
    "ru": "Вспомогательные функции",
    "uz": "Yordamchi funksiyalar"
  },
  "turlari": {
    "en": "types",
    "ru": "типы",
    "uz": "turlari"
  },
  "Statik ma'lumotlar": {
    "en": "Static data",
    "ru": "Статические данные",
    "uz": "Statik ma'lumotlar"
  },
  "Asosiy sahifalar": {
    "en": "Main pages",
    "ru": "Основные страницы",
    "uz": "Asosiy sahifalar"
  },
  "Sahifa": {
    "en": "Page",
    "ru": "Страница",
    "uz": "Sahifa"
  },
  "Yo'nalish": {
    "en": "Route",
    "ru": "Маршрут",
    "uz": "Yo'nalish"
  },
  "Vazifasi": {
    "en": "Function",
    "ru": "Назначение",
    "uz": "Vazifasi"
  },
  "Tizimga kirish": {
    "en": "Sign in",
    "ru": "Вход в систему",
    "uz": "Tizimga kirish"
  },
  "Shifokor bosh sahifasi": {
    "en": "Doctor home page",
    "ru": "Главная страница врача",
    "uz": "Shifokor bosh sahifasi"
  },
  "Bemor tafsilotlari": {
    "en": "Patient details",
    "ru": "Сведения о пациенте",
    "uz": "Bemor tafsilotlari"
  },
  "Bemorlar ro'yxati": {
    "en": "Patient list",
    "ru": "Список пациентов",
    "uz": "Bemorlar ro'yxati"
  },
  "Statistik tahlil": {
    "en": "Statistical analysis",
    "ru": "Статистический анализ",
    "uz": "Statistik tahlil"
  },
  "PDF hisobotlar": {
    "en": "PDF reports",
    "ru": "Отчёты PDF",
    "uz": "PDF hisobotlar"
  },
  "Ogohlantirishlar": {
    "en": "Alerts",
    "ru": "Оповещения",
    "uz": "Ogohlantirishlar"
  },
  "Dori vositalari": {
    "en": "Medications",
    "ru": "Лекарственные средства",
    "uz": "Dori vositalari"
  },
  "Yangi bemor qo'shish": {
    "en": "Add new patient",
    "ru": "Добавление нового пациента",
    "uz": "Yangi bemor qo'shish"
  },
  "Bemorlarni solishtirish": {
    "en": "Compare patients",
    "ru": "Сравнение пациентов",
    "uz": "Bemorlarni solishtirish"
  },
  "Holat boshqaruvi (State Management)": {
    "en": "State management (State Management)",
    "ru": "Управление состоянием (State Management)",
    "uz": "Holat boshqaruvi (State Management)"
  },
  "Loyihada server holati TanStack Query orqali boshqariladi. Har bir ma'lumot turi uchun alohida hook yaratilgan:": {
    "en": "Server state in the project is managed through TanStack Query. A separate hook has been created for each data type:",
    "ru": "Серверное состояние в проекте управляется через TanStack Query. Для каждого типа данных создан отдельный хук:",
    "uz": "Loyihada server holati TanStack Query orqali boshqariladi. Har bir ma'lumot turi uchun alohida hook yaratilgan:"
  },
  "usePatients — bemorlar ro'yxati va qidirish": {
    "en": "usePatients — patient list and search",
    "ru": "usePatients — список и поиск пациентов",
    "uz": "usePatients — bemorlar ro'yxati va qidirish"
  },
  "useLabs — laboratoriya natijalari CRUD": {
    "en": "useLabs — laboratory results CRUD",
    "ru": "useLabs — CRUD лабораторных результатов",
    "uz": "useLabs — laboratoriya natijalari CRUD"
  },
  "useMedications — dori vositalari boshqaruvi": {
    "en": "useMedications — medication management",
    "ru": "useMedications — управление лекарственными средствами",
    "uz": "useMedications — dori vositalari boshqaruvi"
  },
  "useRisk — risk hisoblash va snapshot": {
    "en": "useRisk — risk calculation and snapshot",
    "ru": "useRisk — расчёт риска и снимок состояния",
    "uz": "useRisk — risk hisoblash va snapshot"
  },
  "useAlerts — ogohlantirishlar boshqaruvi": {
    "en": "useAlerts — alert management",
    "ru": "useAlerts — управление оповещениями",
    "uz": "useAlerts — ogohlantirishlar boshqaruvi"
  },
  "usePrediction — AI bashorat so'rovlari": {
    "en": "usePrediction — AI prediction requests",
    "ru": "usePrediction — запросы прогнозов AI",
    "uz": "usePrediction — AI bashorat so'rovlari"
  },
  "useAuth — autentifikatsiya holati va rol boshqaruvi": {
    "en": "useAuth — authentication state and role management",
    "ru": "useAuth — состояние аутентификации и управление ролями",
    "uz": "useAuth — autentifikatsiya holati va rol boshqaruvi"
  },
  "BACKEND TUZILISHI (LOVABLE CLOUD)": {
    "en": "BACKEND STRUCTURE (LOVABLE CLOUD)",
    "ru": "СТРУКТУРА BACKEND (LOVABLE CLOUD)",
    "uz": "BACKEND TUZILISHI (LOVABLE CLOUD)"
  },
  "Backend xizmatlari": {
    "en": "Backend services",
    "ru": "Сервисы backend",
    "uz": "Backend xizmatlari"
  },
  "Xizmat": {
    "en": "Service",
    "ru": "Сервис",
    "uz": "Xizmat"
  },
  "Ma'lumotlar bazasi": {
    "en": "Database",
    "ru": "База данных",
    "uz": "Ma'lumotlar bazasi"
  },
  "PostgreSQL 15 — relyatsion ma'lumotlar": {
    "en": "PostgreSQL 15 — relational data",
    "ru": "PostgreSQL 15 — реляционные данные",
    "uz": "PostgreSQL 15 — relyatsion ma'lumotlar"
  },
  "Autentifikatsiya": {
    "en": "Authentication",
    "ru": "Аутентификация",
    "uz": "Autentifikatsiya"
  },
  "Email/parol asosida foydalanuvchi boshqaruvi": {
    "en": "Email/password-based user management",
    "ru": "Управление пользователями на основе электронной почты и пароля",
    "uz": "Email/parol asosida foydalanuvchi boshqaruvi"
  },
  "Serverless API endpointlar (Deno)": {
    "en": "Serverless API endpoints (Deno)",
    "ru": "Бессерверные конечные точки API (Deno)",
    "uz": "Serverless API endpointlar (Deno)"
  },
  "Fayl saqlash": {
    "en": "File storage",
    "ru": "Хранение файлов",
    "uz": "Fayl saqlash"
  },
  "Laboratoriya hisobotlari (PDF/rasm)": {
    "en": "Laboratory reports (PDF/image)",
    "ru": "Лабораторные отчёты (PDF/изображение)",
    "uz": "Laboratoriya hisobotlari (PDF/rasm)"
  },
  "Jonli ma'lumot yangilanishlari": {
    "en": "Live data updates",
    "ru": "Обновления данных в реальном времени",
    "uz": "Jonli ma'lumot yangilanishlari"
  },
  "Edge Functions ro'yxati": {
    "en": "List of Edge Functions",
    "ru": "Список Edge Functions",
    "uz": "Edge Functions ro'yxati"
  },
  "Funksiya": {
    "en": "Function",
    "ru": "Функция",
    "uz": "Funksiya"
  },
  "AI modeli": {
    "en": "AI model",
    "ru": "Модель AI",
    "uz": "AI modeli"
  },
  "Graft rad etish xavfini bashorat qilish": {
    "en": "Predicting graft rejection risk",
    "ru": "Прогнозирование риска отторжения трансплантата",
    "uz": "Graft rad etish xavfini bashorat qilish"
  },
  "Laboratoriya hisobotini OCR skanerlash": {
    "en": "OCR scanning of a laboratory report",
    "ru": "OCR-сканирование лабораторного отчёта",
    "uz": "Laboratoriya hisobotini OCR skanerlash"
  },
  "Matnni tarjima qilish": {
    "en": "Text translation",
    "ru": "Перевод текста",
    "uz": "Matnni tarjima qilish"
  },
  "Risk balini qayta hisoblash": {
    "en": "Recalculating the risk score",
    "ru": "Пересчёт балла риска",
    "uz": "Risk balini qayta hisoblash"
  },
  "Tizim holati tekshiruvi": {
    "en": "System health check",
    "ru": "Проверка состояния системы",
    "uz": "Tizim holati tekshiruvi"
  },
  "Autentifikatsiya oqimi": {
    "en": "Authentication flow",
    "ru": "Процесс аутентификации",
    "uz": "Autentifikatsiya oqimi"
  },
  "Foydalanuvchi email va parol bilan ro'yxatdan o'tadi": {
    "en": "The user registers with an email and password",
    "ru": "Пользователь регистрируется с электронной почтой и паролем",
    "uz": "Foydalanuvchi email va parol bilan ro'yxatdan o'tadi"
  },
  "Email tasdiqlash xati yuboriladi (auto-confirm o'chirilgan)": {
    "en": "A confirmation email is sent (auto-confirm disabled)",
    "ru": "Отправляется письмо для подтверждения электронной почты (auto-confirm отключён)",
    "uz": "Email tasdiqlash xati yuboriladi (auto-confirm o'chirilgan)"
  },
  "Emailni tasdiqlash → tizimga kirish → rol tanlash": {
    "en": "Confirm email → sign in → select role",
    "ru": "Подтверждение электронной почты → вход в систему → выбор роли",
    "uz": "Emailni tasdiqlash → tizimga kirish → rol tanlash"
  },
  "Rol user_roles jadvaliga saqlanadi (xavfsiz, alohida jadval)": {
    "en": "The role is saved in the user_roles table (secure, separate table)",
    "ru": "Роль сохраняется в таблице user_roles (безопасная отдельная таблица)",
    "uz": "Rol user_roles jadvaliga saqlanadi (xavfsiz, alohida jadval)"
  },
  "JWT token har bir API so'rovda yuboriladi": {
    "en": "A JWT token is sent with every API request",
    "ru": "Токен JWT отправляется с каждым запросом API",
    "uz": "JWT token har bir API so'rovda yuboriladi"
  },
  "RLS siyosatlari orqali ma'lumotlarga kirish nazorat qilinadi": {
    "en": "Data access is controlled through RLS policies",
    "ru": "Доступ к данным контролируется политиками RLS",
    "uz": "RLS siyosatlari orqali ma'lumotlarga kirish nazorat qilinadi"
  },
  "MA'LUMOTLAR BAZASI DIZAYNI": {
    "en": "DATABASE DESIGN",
    "ru": "ПРОЕКТИРОВАНИЕ БАЗЫ ДАННЫХ",
    "uz": "MA'LUMOTLAR BAZASI DIZAYNI"
  },
  "Jadvallar ro'yxati (13 ta)": {
    "en": "List of tables (13)",
    "ru": "Список таблиц (13)",
    "uz": "Jadvallar ro'yxati (13 ta)"
  },
  "Jadval nomi": {
    "en": "Table name",
    "ru": "Название таблицы",
    "uz": "Jadval nomi"
  },
  "Taxminiy qatorlar": {
    "en": "Approximate rows",
    "ru": "Примерное число строк",
    "uz": "Taxminiy qatorlar"
  },
  "Bemorlar — asosiy jadval": {
    "en": "Patients — main table",
    "ru": "Пациенты — основная таблица",
    "uz": "Bemorlar — asosiy jadval"
  },
  "Laboratoriya natijalari (30+ parametr)": {
    "en": "Laboratory results (30+ parameters)",
    "ru": "Лабораторные результаты (30+ показателей)",
    "uz": "Laboratoriya natijalari (30+ parametr)"
  },
  "Dori iste'mol kuzatuvi": {
    "en": "Medication intake tracking",
    "ru": "Отслеживание приёма лекарств",
    "uz": "Dori iste'mol kuzatuvi"
  },
  "Dozaj o'zgarishlari tarixi": {
    "en": "Dose change history",
    "ru": "История изменений дозировки",
    "uz": "Dozaj o'zgarishlari tarixi"
  },
  "Risk hisoblash tarixi": {
    "en": "Risk calculation history",
    "ru": "История расчёта риска",
    "uz": "Risk hisoblash tarixi"
  },
  "Bemor hodisalari logi": {
    "en": "Patient event log",
    "ru": "Журнал событий пациента",
    "uz": "Bemor hodisalari logi"
  },
  "Laboratoriya jadvallari": {
    "en": "Laboratory schedules",
    "ru": "Графики лабораторных исследований",
    "uz": "Laboratoriya jadvallari"
  },
  "Klinik chegaralar (KDIGO/BANFF)": {
    "en": "Clinical thresholds (KDIGO/BANFF)",
    "ru": "Клинические пороговые значения (KDIGO/BANFF)",
    "uz": "Klinik chegaralar (KDIGO/BANFF)"
  },
  "Transplant episodlari (ko'p operatsiya tarixi)": {
    "en": "Transplant episodes (multiple-surgery history)",
    "ru": "Эпизоды трансплантации (история нескольких операций)",
    "uz": "Transplant episodlari (ko'p operatsiya tarixi)"
  },
  "Tizim audit loglari": {
    "en": "System audit logs",
    "ru": "Журналы аудита системы",
    "uz": "Tizim audit loglari"
  },
  "Foydalanuvchi rollari": {
    "en": "User roles",
    "ru": "Роли пользователей",
    "uz": "Foydalanuvchi rollari"
  },
  "Asosiy bog'lanishlar": {
    "en": "Main relationships",
    "ru": "Основные связи",
    "uz": "Asosiy bog'lanishlar"
  },
  "Saqlangan protseduralar (Functions)": {
    "en": "Stored procedures (Functions)",
    "ru": "Хранимые процедуры (Functions)",
    "uz": "Saqlangan protseduralar (Functions)"
  },
  "Nomi": {
    "en": "Name",
    "ru": "Название",
    "uz": "Nomi"
  },
  "Turi": {
    "en": "Type",
    "ru": "Тип",
    "uz": "Turi"
  },
  "Lab kiritish + risk qayta hisoblash (atom tranzaksiya)": {
    "en": "Lab entry + risk recalculation (atomic transaction)",
    "ru": "Ввод лабораторных данных + пересчёт риска (атомарная транзакция)",
    "uz": "Lab kiritish + risk qayta hisoblash (atom tranzaksiya)"
  },
  "Transplant sanasi bo'yicha jadval generatsiyasi": {
    "en": "Schedule generation based on transplant date",
    "ru": "Формирование графика по дате трансплантации",
    "uz": "Transplant sanasi bo'yicha jadval generatsiyasi"
  },
  "RLS uchun rol tekshiruvi (rekursiyasiz)": {
    "en": "Role check for RLS (without recursion)",
    "ru": "Проверка роли для RLS (без рекурсии)",
    "uz": "RLS uchun rol tekshiruvi (rekursiyasiz)"
  },
  "Bemor o'zi ro'yxatdan o'tishi + telefon bo'yicha bog'lash": {
    "en": "Patient self-registration + linking by phone",
    "ru": "Самостоятельная регистрация пациента + привязка по телефону",
    "uz": "Bemor o'zi ro'yxatdan o'tishi + telefon bo'yicha bog'lash"
  },
  "Telefon raqamini +998... formatiga standartlashtirish": {
    "en": "Standardizing phone numbers to the +998... format",
    "ru": "Стандартизация номера телефона к формату +998...",
    "uz": "Telefon raqamini +998... formatiga standartlashtirish"
  },
  "Admin bo'lmasa doctor/admin rol berish taqiqlanadi": {
    "en": "Assigning the doctor/admin role is prohibited for non-admins",
    "ru": "Пользователям, не являющимся admin, запрещено назначать роли doctor/admin",
    "uz": "Admin bo'lmasa doctor/admin rol berish taqiqlanadi"
  },
  "updated_at ustunini avtomatik yangilash": {
    "en": "Automatically updating the updated_at column",
    "ru": "Автоматическое обновление столбца updated_at",
    "uz": "updated_at ustunini avtomatik yangilash"
  },
  "Triggerlar (14 ta)": {
    "en": "Triggers (14)",
    "ru": "Триггеры (14)",
    "uz": "Triggerlar (14 ta)"
  },
  "Trigger nomi": {
    "en": "Trigger name",
    "ru": "Название триггера",
    "uz": "Trigger nomi"
  },
  "Jadval": {
    "en": "Table",
    "ru": "Таблица",
    "uz": "Jadval"
  },
  "Risk snapshot qo'shilganda bemorning risk_level ni yangilash": {
    "en": "Update the patient's risk_level when a risk snapshot is added",
    "ru": "Обновление risk_level пациента при добавлении снимка риска",
    "uz": "Risk snapshot qo'shilganda bemorning risk_level ni yangilash"
  },
  "Lab natija kiritilganda klinik chegaralarga qarab avtomatik alert yaratish": {
    "en": "Automatically create an alert based on clinical thresholds when a lab result is entered",
    "ru": "Автоматическое создание оповещения на основе клинических пороговых значений при вводе лабораторного результата",
    "uz": "Lab natija kiritilganda klinik chegaralarga qarab avtomatik alert yaratish"
  },
  "Bemor telefonini INSERT/UPDATE da normalizatsiya qilish": {
    "en": "Normalize the patient's phone number on INSERT/UPDATE",
    "ru": "Нормализация телефона пациента при INSERT/UPDATE",
    "uz": "Bemor telefonini INSERT/UPDATE da normalizatsiya qilish"
  },
  "Transplant sanasi kiritilganda lab jadvali generatsiya qilish": {
    "en": "Generate a lab schedule when the transplant date is entered",
    "ru": "Формирование графика лабораторных исследований при вводе даты трансплантации",
    "uz": "Transplant sanasi kiritilganda lab jadvali generatsiya qilish"
  },
  "Dozaj o'zgartirilganda bemorga alert yuborish": {
    "en": "Send the patient an alert when the dose is changed",
    "ru": "Отправка оповещения пациенту при изменении дозировки",
    "uz": "Dozaj o'zgartirilganda bemorga alert yuborish"
  },
  "2+ kun dori qabul qilinmasa ogohlantirish yaratish": {
    "en": "Create an alert if medication is not taken for 2+ days",
    "ru": "Создание оповещения, если лекарство не принимается 2+ дня",
    "uz": "2+ kun dori qabul qilinmasa ogohlantirish yaratish"
  },
  "Admin bo'lmagan foydalanuvchi yuqori rol olishini taqiqlash": {
    "en": "Prevent a non-admin user from obtaining an elevated role",
    "ru": "Запрет получения повышенной роли пользователем, не являющимся admin",
    "uz": "Admin bo'lmagan foydalanuvchi yuqori rol olishini taqiqlash"
  },
  "SUN'IY INTELLEKT IMKONIYATLARI": {
    "en": "ARTIFICIAL INTELLIGENCE CAPABILITIES",
    "ru": "ВОЗМОЖНОСТИ ИСКУССТВЕННОГО ИНТЕЛЛЕКТА",
    "uz": "SUN'IY INTELLEKT IMKONIYATLARI"
  },
  "AI integratsiya arxitekturasi": {
    "en": "AI integration architecture",
    "ru": "Архитектура интеграции AI",
    "uz": "AI integratsiya arxitekturasi"
  },
  "Tizim Lovable AI Gateway orqali Google Gemini va OpenAI modellariga ulanadi. API kaliti server tomonida saqlanadi, klient faqat Edge Functions ga so'rov yuboradi.": {
    "en": "The system connects to Google Gemini and OpenAI models through Lovable AI Gateway. The API key is stored on the server side; the client sends requests only to Edge Functions.",
    "ru": "Система подключается к моделям Google Gemini и OpenAI через Lovable AI Gateway. Ключ API хранится на серверной стороне, клиент отправляет запросы только к Edge Functions.",
    "uz": "Tizim Lovable AI Gateway orqali Google Gemini va OpenAI modellariga ulanadi. API kaliti server tomonida saqlanadi, klient faqat Edge Functions ga so'rov yuboradi."
  },
  "Kirish": {
    "en": "Input",
    "ru": "Вход",
    "uz": "Kirish"
  },
  "Chiqish": {
    "en": "Output",
    "ru": "Выход",
    "uz": "Chiqish"
  },
  "Graft rad bashorati": {
    "en": "Graft rejection prediction",
    "ru": "Прогноз отторжения трансплантата",
    "uz": "Graft rad bashorati"
  },
  "Lab trendlari + qon guruhi": {
    "en": "Lab trends + blood group",
    "ru": "Динамика лабораторных показателей + группа крови",
    "uz": "Lab trendlari + qon guruhi"
  },
  "Risk daraja + sabab + vaqt": {
    "en": "Risk level + reason + time",
    "ru": "Уровень риска + причина + время",
    "uz": "Risk daraja + sabab + vaqt"
  },
  "OCR skanerlash": {
    "en": "OCR scanning",
    "ru": "OCR-сканирование",
    "uz": "OCR skanerlash"
  },
  "PDF/rasm (base64)": {
    "en": "PDF/image (base64)",
    "ru": "PDF/изображение (base64)",
    "uz": "PDF/rasm (base64)"
  },
  "Strukturalangan lab natijalar": {
    "en": "Structured lab results",
    "ru": "Структурированные лабораторные результаты",
    "uz": "Strukturalangan lab natijalar"
  },
  "Tarjima": {
    "en": "Translation",
    "ru": "Перевод",
    "uz": "Tarjima"
  },
  "Matn + maqsad til": {
    "en": "Text + target language",
    "ru": "Текст + целевой язык",
    "uz": "Matn + maqsad til"
  },
  "Tarjima qilingan matn": {
    "en": "Translated text",
    "ru": "Переведённый текст",
    "uz": "Tarjima qilingan matn"
  },
  "Risk qayta hisoblash": {
    "en": "Risk recalculation",
    "ru": "Пересчёт риска",
    "uz": "Risk qayta hisoblash"
  },
  "Lab + klinik chegaralar": {
    "en": "Lab + clinical thresholds",
    "ru": "Лабораторные данные + клинические пороговые значения",
    "uz": "Lab + klinik chegaralar"
  },
  "Risk ball + bayroqlar": {
    "en": "Risk score + flags",
    "ru": "Балл риска + флаги",
    "uz": "Risk ball + bayroqlar"
  },
  "AI bashorat tafsilotlari": {
    "en": "AI prediction details",
    "ru": "Подробности прогнозирования AI",
    "uz": "AI bashorat tafsilotlari"
  },
  "Tool Calling: AI strukturalangan javob qaytarishi uchun function calling ishlatiladi": {
    "en": "Tool Calling: function calling is used for AI to return a structured response",
    "ru": "Tool Calling: function calling используется, чтобы AI возвращал структурированный ответ",
    "uz": "Tool Calling: AI strukturalangan javob qaytarishi uchun function calling ishlatiladi"
  },
  "Jigar transplanti: ALT, AST, Tacrolimus, Bilirubin, GGT, ALP trend tahlili": {
    "en": "Liver transplant: trend analysis of ALT, AST, Tacrolimus, Bilirubin, GGT, ALP",
    "ru": "Трансплантация печени: анализ динамики ALT, AST, такролимуса, билирубина, GGT, ALP",
    "uz": "Jigar transplanti: ALT, AST, Tacrolimus, Bilirubin, GGT, ALP trend tahlili"
  },
  "Buyrak transplanti: Kreatinin, eGFR, Proteinuriya, Kaliy trend tahlili": {
    "en": "Kidney transplant: trend analysis of creatinine, eGFR, proteinuria, potassium",
    "ru": "Трансплантация почки: анализ динамики креатинина, eGFR, протеинурии, калия",
    "uz": "Buyrak transplanti: Kreatinin, eGFR, Proteinuriya, Kaliy trend tahlili"
  },
  "Qon guruhi mos kelmasligi — AMR (Antibody-Mediated Rejection) xavfini oshiradi": {
    "en": "Blood group incompatibility increases the risk of AMR (Antibody-Mediated Rejection)",
    "ru": "Несовместимость групп крови повышает риск AMR (Antibody-Mediated Rejection)",
    "uz": "Qon guruhi mos kelmasligi — AMR (Antibody-Mediated Rejection) xavfini oshiradi"
  },
  "Ogohlantirish: Barcha AI natijalar «Shifokor tomonidan tekshirilishi shart» izohi bilan chiqadi": {
    "en": "Warning: All AI results are displayed with the note «Must be reviewed by a doctor»",
    "ru": "Предупреждение: Все результаты AI выводятся с примечанием «Обязательна проверка врачом»",
    "uz": "Ogohlantirish: Barcha AI natijalar «Shifokor tomonidan tekshirilishi shart» izohi bilan chiqadi"
  },
  "ASOSIY TIZIM FUNKSIYALARI": {
    "en": "CORE SYSTEM FUNCTIONS",
    "ru": "ОСНОВНЫЕ ФУНКЦИИ СИСТЕМЫ",
    "uz": "ASOSIY TIZIM FUNKSIYALARI"
  },
  "Bemorlarni boshqarish": {
    "en": "Patient management",
    "ru": "Ведение пациентов",
    "uz": "Bemorlarni boshqarish"
  },
  "Bemor ro'yxatga olish: ism, tug'ilgan sana, jins, viloyat, tuman, organ turi": {
    "en": "Patient registration: name, date of birth, sex, region, district, organ type",
    "ru": "Регистрация пациента: имя, дата рождения, пол, область, район, тип органа",
    "uz": "Bemor ro'yxatga olish: ism, tug'ilgan sana, jins, viloyat, tuman, organ turi"
  },
  "Qon guruhi va donor qon guruhi, titer terapiya holati": {
    "en": "Blood group and donor blood group, titer therapy status",
    "ru": "Группа крови и группа крови донора, статус титр-терапии",
    "uz": "Qon guruhi va donor qon guruhi, titer terapiya holati"
  },
  "Transplant tarixi: sana, raqam, dializ tarixi": {
    "en": "Transplant history: date, number, dialysis history",
    "ru": "История трансплантации: дата, номер, история диализа",
    "uz": "Transplant tarixi: sana, raqam, dializ tarixi"
  },
  "Bemorlarni qidirish, filtrlash va saralash": {
    "en": "Patient search, filtering, and sorting",
    "ru": "Поиск, фильтрация и сортировка пациентов",
    "uz": "Bemorlarni qidirish, filtrlash va saralash"
  },
  "Laboratoriya natijalari": {
    "en": "Laboratory results",
    "ru": "Лабораторные результаты",
    "uz": "Laboratoriya natijalari"
  },
  "30+ parametr qo'llab-quvvatlanadi (kreatinin, ALT, AST, tacrolimus va boshqalar)": {
    "en": "30+ parameters supported (creatinine, ALT, AST, tacrolimus, and others)",
    "ru": "Поддерживаются 30+ показателей (креатинин, ALT, AST, такролимус и другие)",
    "uz": "30+ parametr qo'llab-quvvatlanadi (kreatinin, ALT, AST, tacrolimus va boshqalar)"
  },
  "Qo'lda kiritish yoki OCR orqali avtomatik raqamlashtirish": {
    "en": "Manual entry or automatic digitization using OCR",
    "ru": "Ручной ввод или автоматическая оцифровка с помощью OCR",
    "uz": "Qo'lda kiritish yoki OCR orqali avtomatik raqamlashtirish"
  },
  "Trend grafiklari (Recharts) — vaqt bo'yicha parametr o'zgarishi": {
    "en": "Trend charts (Recharts) — parameter changes over time",
    "ru": "Графики динамики (Recharts) — изменение показателя во времени",
    "uz": "Trend grafiklari (Recharts) — vaqt bo'yicha parametr o'zgarishi"
  },
  "Natijalar tarixini jadval va grafik ko'rinishida ko'rish": {
    "en": "View result history in table and chart form",
    "ru": "Просмотр истории результатов в виде таблиц и графиков",
    "uz": "Natijalar tarixini jadval va grafik ko'rinishida ko'rish"
  },
  "Risk tahlili": {
    "en": "Risk analysis",
    "ru": "Анализ риска",
    "uz": "Risk tahlili"
  },
  "Algoritmik risk hisoblash: klinik chegaralar + trend tahlili": {
    "en": "Algorithmic risk calculation: clinical thresholds + trend analysis",
    "ru": "Алгоритмический расчёт риска: клинические пороговые значения + анализ динамики",
    "uz": "Algoritmik risk hisoblash: klinik chegaralar + trend tahlili"
  },
  "AI bashorat: graft rad etish ehtimoli (7–14 kun)": {
    "en": "AI prediction: probability of graft rejection (7–14 days)",
    "ru": "Прогноз AI: вероятность отторжения трансплантата (7–14 дней)",
    "uz": "AI bashorat: graft rad etish ehtimoli (7–14 kun)"
  },
  "Risk snapshotlar tarixi — vaqt bo'yicha risk o'zgarishini kuzatish": {
    "en": "Risk snapshot history — tracking risk changes over time",
    "ru": "История снимков риска — отслеживание изменения риска во времени",
    "uz": "Risk snapshotlar tarixi — vaqt bo'yicha risk o'zgarishini kuzatish"
  },
  "Ustuvorlik paneli: eng yuqori riskli bemorlar birinchi": {
    "en": "Priority panel: highest-risk patients first",
    "ru": "Панель приоритетов: пациенты с наибольшим риском первыми",
    "uz": "Ustuvorlik paneli: eng yuqori riskli bemorlar birinchi"
  },
  "Muhim lab parametrlari oshganda avtomatik ogohlantirishlar": {
    "en": "Automatic alerts when critical lab parameters rise",
    "ru": "Автоматические оповещения при повышении важных лабораторных показателей",
    "uz": "Muhim lab parametrlari oshganda avtomatik ogohlantirishlar"
  },
  "Muddati o'tgan laboratoriya jadvallari haqida eslatmalar": {
    "en": "Reminders about overdue laboratory schedules",
    "ru": "Напоминания о просроченных лабораторных исследованиях",
    "uz": "Muddati o'tgan laboratoriya jadvallari haqida eslatmalar"
  },
  "O'qilmagan ogohlantirishlar soni — bosh sahifada ko'rsatiladi": {
    "en": "Unread alert count — displayed on the home page",
    "ru": "Количество непрочитанных оповещений — отображается на главной странице",
    "uz": "O'qilmagan ogohlantirishlar soni — bosh sahifada ko'rsatiladi"
  },
  "Dori vositalari nazorati": {
    "en": "Medication monitoring",
    "ru": "Контроль лекарственных средств",
    "uz": "Dori vositalari nazorati"
  },
  "Dori qo'shish, dozaj o'zgartirish, to'xtatish": {
    "en": "Add medication, change dose, discontinue",
    "ru": "Добавление лекарства, изменение дозировки, отмена",
    "uz": "Dori qo'shish, dozaj o'zgartirish, to'xtatish"
  },
  "Dozaj o'zgarishlari tarixi (kim, qachon, nima uchun)": {
    "en": "Dose change history (who, when, why)",
    "ru": "История изменений дозировки (кто, когда, почему)",
    "uz": "Dozaj o'zgarishlari tarixi (kim, qachon, nima uchun)"
  },
  "Iste'mol kuzatuvi (adherence tracking)": {
    "en": "Intake tracking (adherence tracking)",
    "ru": "Отслеживание приёма (adherence tracking)",
    "uz": "Iste'mol kuzatuvi (adherence tracking)"
  },
  "Hisobotlar": {
    "en": "Reports",
    "ru": "Отчёты",
    "uz": "Hisobotlar"
  },
  "Oylik reeystr, choraklik statistika, dori iste'moli, hudud tahlili": {
    "en": "Monthly registry, quarterly statistics, medication intake, regional analysis",
    "ru": "Ежемесячный реестр, ежеквартальная статистика, приём лекарств, региональный анализ",
    "uz": "Oylik reeystr, choraklik statistika, dori iste'moli, hudud tahlili"
  },
  "Klient tomonida PDF generatsiya (jsPDF — hisobotlar, pdfMake — texnik hujjat)": {
    "en": "Client-side PDF generation (jsPDF — reports, pdfMake — technical document)",
    "ru": "Формирование PDF на стороне клиента (jsPDF — отчёты, pdfMake — технический документ)",
    "uz": "Klient tomonida PDF generatsiya (jsPDF — hisobotlar, pdfMake — texnik hujjat)"
  },
  "XAVFSIZLIK": {
    "en": "SECURITY",
    "ru": "БЕЗОПАСНОСТЬ",
    "uz": "XAVFSIZLIK"
  },
  "Email + parol asosida ro'yxatdan o'tish va kirish": {
    "en": "Email + password registration and sign-in",
    "ru": "Регистрация и вход по электронной почте + паролю",
    "uz": "Email + parol asosida ro'yxatdan o'tish va kirish"
  },
  "Email tasdiqlash majburiy (auto-confirm o'chirilgan)": {
    "en": "Email confirmation required (auto-confirm disabled)",
    "ru": "Подтверждение электронной почты обязательно (auto-confirm отключён)",
    "uz": "Email tasdiqlash majburiy (auto-confirm o'chirilgan)"
  },
  "JWT tokenlar — har bir API so'rovda Authorization header": {
    "en": "JWT tokens — Authorization header in every API request",
    "ru": "Токены JWT — заголовок Authorization в каждом запросе API",
    "uz": "JWT tokenlar — har bir API so'rovda Authorization header"
  },
  "Sessiya muddati tugashi (session timeout) — useSessionTimeout hook": {
    "en": "Session expiration (session timeout) — useSessionTimeout hook",
    "ru": "Истечение срока сеанса (session timeout) — хук useSessionTimeout",
    "uz": "Sessiya muddati tugashi (session timeout) — useSessionTimeout hook"
  },
  "Avtorizatsiya (RBAC)": {
    "en": "Authorization (RBAC)",
    "ru": "Авторизация (RBAC)",
    "uz": "Avtorizatsiya (RBAC)"
  },
  "4 ta rol: admin, doctor, patient, support": {
    "en": "4 roles: admin, doctor, patient, support",
    "ru": "4 роли: admin, doctor, patient, support",
    "uz": "4 ta rol: admin, doctor, patient, support"
  },
  "Rollar alohida user_roles jadvalida (privilege escalation himoyasi)": {
    "en": "Roles in a separate user_roles table (privilege escalation protection)",
    "ru": "Роли в отдельной таблице user_roles (защита от повышения привилегий)",
    "uz": "Rollar alohida user_roles jadvalida (privilege escalation himoyasi)"
  },
  "has_role() funksiyasi — SECURITY DEFINER (RLS rekursiyasiz)": {
    "en": "has_role() function — SECURITY DEFINER (without RLS recursion)",
    "ru": "Функция has_role() — SECURITY DEFINER (без рекурсии RLS)",
    "uz": "has_role() funksiyasi — SECURITY DEFINER (RLS rekursiyasiz)"
  },
  "Frontend: ProtectedRoute, DoctorOrAdminRoute komponentlari": {
    "en": "Frontend: ProtectedRoute, DoctorOrAdminRoute components",
    "ru": "Frontend: компоненты ProtectedRoute, DoctorOrAdminRoute",
    "uz": "Frontend: ProtectedRoute, DoctorOrAdminRoute komponentlari"
  },
  "Barcha jadvallarda RLS yoqilgan. Har bir jadval uchun SELECT, INSERT, UPDATE, DELETE siyosatlari mavjud. Shifokor faqat o'ziga biriktirilgan bemorlarni ko'radi, admin barcha ma'lumotlarga kira oladi.": {
    "en": "RLS is enabled on all tables. SELECT, INSERT, UPDATE, DELETE policies exist for each table. A doctor sees only their assigned patients; an admin can access all data.",
    "ru": "RLS включён во всех таблицах. Для каждой таблицы существуют политики SELECT, INSERT, UPDATE, DELETE. Врач видит только закреплённых за ним пациентов, admin имеет доступ ко всем данным.",
    "uz": "Barcha jadvallarda RLS yoqilgan. Har bir jadval uchun SELECT, INSERT, UPDATE, DELETE siyosatlari mavjud. Shifokor faqat o'ziga biriktirilgan bemorlarni ko'radi, admin barcha ma'lumotlarga kira oladi."
  },
  "API xavfsizligi": {
    "en": "API security",
    "ru": "Безопасность API",
    "uz": "API xavfsizligi"
  },
  "Rate limiting: barcha Edge Functions uchun foydalanuvchi asosida cheklov": {
    "en": "Rate limiting: per-user limits for all Edge Functions",
    "ru": "Rate limiting: ограничения на пользователя для всех Edge Functions",
    "uz": "Rate limiting: barcha Edge Functions uchun foydalanuvchi asosida cheklov"
  },
  "CORS: faqat ruxsat berilgan domenlardan so'rovlar qabul qilinadi": {
    "en": "CORS: requests are accepted only from allowed domains",
    "ru": "CORS: запросы принимаются только с разрешённых доменов",
    "uz": "CORS: faqat ruxsat berilgan domenlardan so'rovlar qabul qilinadi"
  },
  "Storage RLS: fayl egasi, biriktirilgan shifokor yoki admin faqat kira oladi": {
    "en": "Storage RLS: only the file owner, assigned doctor, or admin can access",
    "ru": "Storage RLS: доступ имеют только владелец файла, закреплённый врач или admin",
    "uz": "Storage RLS: fayl egasi, biriktirilgan shifokor yoki admin faqat kira oladi"
  },
  "Audit log: muhim harakatlar audit_logs jadvaliga yoziladi": {
    "en": "Audit log: important actions are recorded in the audit_logs table",
    "ru": "Audit log: важные действия записываются в таблицу audit_logs",
    "uz": "Audit log: muhim harakatlar audit_logs jadvaliga yoziladi"
  },
  "ISHLASH SAMARADORLIGI VA MASSHTABLASH": {
    "en": "PERFORMANCE AND SCALING",
    "ru": "ПРОИЗВОДИТЕЛЬНОСТЬ И МАСШТАБИРОВАНИЕ",
    "uz": "ISHLASH SAMARADORLIGI VA MASSHTABLASH"
  },
  "Frontend optimizatsiya": {
    "en": "Frontend optimization",
    "ru": "Оптимизация frontend",
    "uz": "Frontend optimizatsiya"
  },
  "Code splitting: React.lazy() — sahifalar alohida yuklanadi": {
    "en": "Code splitting: React.lazy() — pages are loaded separately",
    "ru": "Code splitting: React.lazy() — страницы загружаются отдельно",
    "uz": "Code splitting: React.lazy() — sahifalar alohida yuklanadi"
  },
  "TanStack Query keshlash: staleTime 2 daqiqa, gcTime 10 daqiqa": {
    "en": "TanStack Query caching: staleTime 2 minutes, gcTime 10 minutes",
    "ru": "Кеширование TanStack Query: staleTime 2 минуты, gcTime 10 минут",
    "uz": "TanStack Query keshlash: staleTime 2 daqiqa, gcTime 10 daqiqa"
  },
  "Refetch on window focus — foydalanuvchi qaytganda yangilanadi": {
    "en": "Refetch on window focus — updates when the user returns",
    "ru": "Refetch on window focus — обновляется при возвращении пользователя",
    "uz": "Refetch on window focus — foydalanuvchi qaytganda yangilanadi"
  },
  "Skeleton loading — ma'lumot yuklanayotganda placeholder": {
    "en": "Skeleton loading — placeholder while data is loading",
    "ru": "Skeleton loading — заполнитель во время загрузки данных",
    "uz": "Skeleton loading — ma'lumot yuklanayotganda placeholder"
  },
  "Backend optimizatsiya": {
    "en": "Backend optimization",
    "ru": "Оптимизация backend",
    "uz": "Backend optimizatsiya"
  },
  "insert_lab_and_recalculate — bitta tranzaksiyada lab + risk": {
    "en": "insert_lab_and_recalculate — lab + risk in a single transaction",
    "ru": "insert_lab_and_recalculate — лабораторные данные + риск в одной транзакции",
    "uz": "insert_lab_and_recalculate — bitta tranzaksiyada lab + risk"
  },
  "Indekslar: patient_id va recorded_at ustunlarida avtomatik indeks": {
    "en": "Indexes: automatic index on patient_id and recorded_at columns",
    "ru": "Индексы: автоматический индекс по столбцам patient_id и recorded_at",
    "uz": "Indekslar: patient_id va recorded_at ustunlarida avtomatik indeks"
  },
  "Edge Functions: cold start minimal (Deno lightweight runtime)": {
    "en": "Edge Functions: minimal cold start (Deno lightweight runtime)",
    "ru": "Edge Functions: минимальный cold start (легковесная среда выполнения Deno)",
    "uz": "Edge Functions: cold start minimal (Deno lightweight runtime)"
  },
  "Rate limiting: AI funksiyalarga suiste'molni oldini olish": {
    "en": "Rate limiting: preventing abuse of AI functions",
    "ru": "Rate limiting: предотвращение злоупотребления функциями AI",
    "uz": "Rate limiting: AI funksiyalarga suiste'molni oldini olish"
  },
  "Masshtablash strategiyasi": {
    "en": "Scaling strategy",
    "ru": "Стратегия масштабирования",
    "uz": "Masshtablash strategiyasi"
  },
  "Gorizontal: Edge Functions avtomatik masshtablanadi": {
    "en": "Horizontal: Edge Functions scale automatically",
    "ru": "Горизонтальное: Edge Functions масштабируются автоматически",
    "uz": "Gorizontal: Edge Functions avtomatik masshtablanadi"
  },
  "Vertikal: PostgreSQL connection pooling (PgBouncer)": {
    "en": "Vertical: PostgreSQL connection pooling (PgBouncer)",
    "ru": "Вертикальное: пул соединений PostgreSQL (PgBouncer)",
    "uz": "Vertikal: PostgreSQL connection pooling (PgBouncer)"
  },
  "Ma'lumot: sahifalash (pagination) va limit qo'llaniladi (standart 1000 qator)": {
    "en": "Data: pagination and a limit are applied (default 1000 rows)",
    "ru": "Данные: применяется разбиение на страницы (pagination) и ограничение (по умолчанию 1000 строк)",
    "uz": "Ma'lumot: sahifalash (pagination) va limit qo'llaniladi (standart 1000 qator)"
  },
  "LOYIHANING JORIY HOLATI": {
    "en": "CURRENT PROJECT STATUS",
    "ru": "ТЕКУЩЕЕ СОСТОЯНИЕ ПРОЕКТА",
    "uz": "LOYIHANING JORIY HOLATI"
  },
  "Tugallangan modullar (~92%)": {
    "en": "Completed modules (~92%)",
    "ru": "Завершённые модули (~92%)",
    "uz": "Tugallangan modullar (~92%)"
  },
  "Modul": {
    "en": "Module",
    "ru": "Модуль",
    "uz": "Modul"
  },
  "Holat": {
    "en": "Status",
    "ru": "Статус",
    "uz": "Holat"
  },
  "Tayyor %": {
    "en": "Complete %",
    "ru": "Готовность %",
    "uz": "Tayyor %"
  },
  "Autentifikatsiya va RBAC": {
    "en": "Authentication and RBAC",
    "ru": "Аутентификация и RBAC",
    "uz": "Autentifikatsiya va RBAC"
  },
  "Tugallangan": {
    "en": "Completed",
    "ru": "Завершено",
    "uz": "Tugallangan"
  },
  "AI bashorat": {
    "en": "AI prediction",
    "ru": "Прогнозирование AI",
    "uz": "AI bashorat"
  },
  "Hisobotlar (PDF)": {
    "en": "Reports (PDF)",
    "ru": "Отчёты (PDF)",
    "uz": "Hisobotlar (PDF)"
  },
  "Ko'p tilli interfeys": {
    "en": "Multilingual interface",
    "ru": "Многоязычный интерфейс",
    "uz": "Ko'p tilli interfeys"
  },
  "Realtime yangilanishlar": {
    "en": "Realtime updates",
    "ru": "Обновления Realtime",
    "uz": "Realtime yangilanishlar"
  },
  "Rejalashtirilgan yaxshilanishlar": {
    "en": "Planned improvements",
    "ru": "Запланированные улучшения",
    "uz": "Rejalashtirilgan yaxshilanishlar"
  },
  "Bemor mobil ilovasi (PWA yoki React Native)": {
    "en": "Patient mobile app (PWA or React Native)",
    "ru": "Мобильное приложение пациента (PWA или React Native)",
    "uz": "Bemor mobil ilovasi (PWA yoki React Native)"
  },
  "SMS/Telegram ogohlantirishlar integratsiyasi": {
    "en": "SMS/Telegram alert integration",
    "ru": "Интеграция оповещений SMS/Telegram",
    "uz": "SMS/Telegram ogohlantirishlar integratsiyasi"
  },
  "Kengaytirilgan analitika dashboard": {
    "en": "Advanced analytics dashboard",
    "ru": "Расширенная аналитическая панель",
    "uz": "Kengaytirilgan analitika dashboard"
  },
  "Chet el klinikalari bilan o'zaro ishlash (FHIR/HL7)": {
    "en": "Interoperability with foreign clinics (FHIR/HL7)",
    "ru": "Взаимодействие с зарубежными клиниками (FHIR/HL7)",
    "uz": "Chet el klinikalari bilan o'zaro ishlash (FHIR/HL7)"
  },
  "KELAJAKDAGI RIVOJLANISH": {
    "en": "FUTURE DEVELOPMENT",
    "ru": "ДАЛЬНЕЙШЕЕ РАЗВИТИЕ",
    "uz": "KELAJAKDAGI RIVOJLANISH"
  },
  "TransplantCare platformasi kelajakda quyidagi tibbiy yo'nalishlarga kengaytirilishi rejalashtirilgan:": {
    "en": "The TransplantCare platform is planned to expand into the following medical specialties in the future:",
    "ru": "В будущем планируется расширение платформы TransplantCare на следующие медицинские направления:",
    "uz": "TransplantCare platformasi kelajakda quyidagi tibbiy yo'nalishlarga kengaytirilishi rejalashtirilgan:"
  },
  "Ustuvorlik": {
    "en": "Priority",
    "ru": "Приоритет",
    "uz": "Ustuvorlik"
  },
  "Onkologiya": {
    "en": "Oncology",
    "ru": "Онкология",
    "uz": "Onkologiya"
  },
  "Saraton bemorlarini kuzatish, kimyoterapiya nazorati": {
    "en": "Monitoring cancer patients, chemotherapy monitoring",
    "ru": "Наблюдение за онкологическими пациентами, контроль химиотерапии",
    "uz": "Saraton bemorlarini kuzatish, kimyoterapiya nazorati"
  },
  "Yuqori": {
    "en": "High",
    "ru": "Высокий",
    "uz": "Yuqori"
  },
  "Kardiologiya": {
    "en": "Cardiology",
    "ru": "Кардиология",
    "uz": "Kardiologiya"
  },
  "Yurak kasalliklari, EKG tahlili, stent kuzatuvi": {
    "en": "Heart diseases, EKG analysis, stent monitoring",
    "ru": "Заболевания сердца, анализ EKG, наблюдение за стентами",
    "uz": "Yurak kasalliklari, EKG tahlili, stent kuzatuvi"
  },
  "O'rta": {
    "en": "Medium",
    "ru": "Средний",
    "uz": "O'rta"
  },
  "Ortopediya": {
    "en": "Orthopedics",
    "ru": "Ортопедия",
    "uz": "Ortopediya"
  },
  "Suyak-bo'g'im operatsiyalari, reabilitatsiya kuzatuvi": {
    "en": "Bone and joint surgery, rehabilitation monitoring",
    "ru": "Операции на костях и суставах, наблюдение за реабилитацией",
    "uz": "Suyak-bo'g'im operatsiyalari, reabilitatsiya kuzatuvi"
  },
  "Past": {
    "en": "Low",
    "ru": "Низкий",
    "uz": "Past"
  },
  "Urologiya": {
    "en": "Urology",
    "ru": "Урология",
    "uz": "Urologiya"
  },
  "Buyrak tosh kasalligi, dializ boshqaruvi": {
    "en": "Kidney stone disease, dialysis management",
    "ru": "Мочекаменная болезнь почек, управление диализом",
    "uz": "Buyrak tosh kasalligi, dializ boshqaruvi"
  },
  "Pediatriya": {
    "en": "Pediatrics",
    "ru": "Педиатрия",
    "uz": "Pediatriya"
  },
  "Bolalar transplantatsiyasi — maxsus dozaj hisoblash": {
    "en": "Pediatric transplantation — specialized dose calculation",
    "ru": "Детская трансплантация — специальный расчёт дозировки",
    "uz": "Bolalar transplantatsiyasi — maxsus dozaj hisoblash"
  },
  "YAKUNIY XULOSA": {
    "en": "FINAL CONCLUSION",
    "ru": "ИТОГОВОЕ ЗАКЛЮЧЕНИЕ",
    "uz": "YAKUNIY XULOSA"
  },
  "TransplantCare — O'zbekistonda transplant tibbiyotini raqamlashtirish yo'lida muhim qadam. Tizim zamonaviy veb texnologiyalar (React, TypeScript, Lovable Cloud) va sun'iy intellekt (Google Gemini) ni birlashtirib, shifokorlarga quyidagi imkoniyatlarni taqdim etadi:": {
    "en": "TransplantCare is an important step toward digitizing transplant medicine in Uzbekistan. By combining modern web technologies (React, TypeScript, Lovable Cloud) and artificial intelligence (Google Gemini), the system provides doctors with the following capabilities:",
    "ru": "TransplantCare — важный шаг на пути цифровизации трансплантационной медицины в Узбекистане. Объединяя современные веб-технологии (React, TypeScript, Lovable Cloud) и искусственный интеллект (Google Gemini), система предоставляет врачам следующие возможности:",
    "uz": "TransplantCare — O'zbekistonda transplant tibbiyotini raqamlashtirish yo'lida muhim qadam. Tizim zamonaviy veb texnologiyalar (React, TypeScript, Lovable Cloud) va sun'iy intellekt (Google Gemini) ni birlashtirib, shifokorlarga quyidagi imkoniyatlarni taqdim etadi:"
  },
  "Bemorlarni markazlashtirilgan holda boshqarish va laboratoriya natijalarini kuzatish": {
    "en": "Centralized patient management and laboratory result monitoring",
    "ru": "Централизованное ведение пациентов и наблюдение за лабораторными результатами",
    "uz": "Bemorlarni markazlashtirilgan holda boshqarish va laboratoriya natijalarini kuzatish"
  },
  "AI yordamida graft rad etish xavfini 7–14 kun oldin bashorat qilish": {
    "en": "Predicting graft rejection risk 7–14 days in advance using AI",
    "ru": "Прогнозирование риска отторжения трансплантата за 7–14 дней с помощью AI",
    "uz": "AI yordamida graft rad etish xavfini 7–14 kun oldin bashorat qilish"
  },
  "Immunosupressiv dorilar dozasini aniq nazorat qilish": {
    "en": "Precise monitoring of immunosuppressive drug doses",
    "ru": "Точный контроль доз иммуносупрессивных препаратов",
    "uz": "Immunosupressiv dorilar dozasini aniq nazorat qilish"
  },
  "Muhim parametrlar oshganda darhol ogohlantirishlar olish": {
    "en": "Receiving immediate alerts when critical parameters rise",
    "ru": "Получение немедленных оповещений при повышении важных показателей",
    "uz": "Muhim parametrlar oshganda darhol ogohlantirishlar olish"
  },
  "OCR orqali qog'oz hisobotlarni raqamlashtirish": {
    "en": "Digitizing paper reports using OCR",
    "ru": "Оцифровка бумажных отчётов с помощью OCR",
    "uz": "OCR orqali qog'oz hisobotlarni raqamlashtirish"
  },
  "Xavfsiz, masshtablanadigan va kengaytiriladigan arxitektura": {
    "en": "Secure, scalable, and extensible architecture",
    "ru": "Безопасная, масштабируемая и расширяемая архитектура",
    "uz": "Xavfsiz, masshtablanadigan va kengaytiriladigan arxitektura"
  },
  "Tizim haqiqiy tibbiy muhitda qo'llanilishga tayyor.": {
    "en": "The system is ready for use in a real clinical setting.",
    "ru": "Система готова к применению в реальной медицинской среде.",
    "uz": "Tizim haqiqiy tibbiy muhitda qo'llanilishga tayyor."
  },
  "Tibbiy ma'lumotlar maxfiyligini ta'minlash uchun barcha xavfsizlik choralari joriy etilgan (RLS, RBAC, rate limiting, audit log).": {
    "en": "All security measures have been implemented to ensure medical data confidentiality (RLS, RBAC, rate limiting, audit log).",
    "ru": "Для обеспечения конфиденциальности медицинских данных внедрены все меры безопасности (RLS, RBAC, rate limiting, audit log).",
    "uz": "Tibbiy ma'lumotlar maxfiyligini ta'minlash uchun barcha xavfsizlik choralari joriy etilgan (RLS, RBAC, rate limiting, audit log)."
  },
  "Texnik hujjat": {
    "en": "Technical document",
    "ru": "Технический документ",
    "uz": "Texnik hujjat"
  },
  "УМУМИЙ МАЪЛУМОТ": {
    "en": "GENERAL INFORMATION",
    "ru": "ОБЩИЕ СВЕДЕНИЯ",
    "uz": "УМУМИЙ МАЪЛУМОТ"
  },
  "Лойиҳа номи": {
    "en": "Project name",
    "ru": "Название проекта",
    "uz": "Лойиҳа номи"
  },
  "Технология": {
    "en": "Technology",
    "ru": "Технология",
    "uz": "Технология"
  },
  "Мақсад": {
    "en": "Purpose",
    "ru": "Назначение",
    "uz": "Мақсад"
  },
  "MVP дашборд (статик)": {
    "en": "MVP dashboard (static)",
    "ru": "Панель MVP (статическая)",
    "uz": "MVP дашборд (статик)"
  },
  "Тўлиқ трансплантация реестри": {
    "en": "Complete transplant registry",
    "ru": "Полный реестр трансплантаций",
    "uz": "Тўлиқ трансплантация реестри"
  },
  "Аутентификация + бемор портали": {
    "en": "Authentication + patient portal",
    "ru": "Аутентификация + портал пациента",
    "uz": "Аутентификация + бемор портали"
  },
  "САҲИФАЛАР": {
    "en": "PAGES",
    "ru": "СТРАНИЦЫ",
    "uz": "САҲИФАЛАР"
  },
  "Беморлар рўйхати": {
    "en": "Patient list",
    "ru": "Список пациентов",
    "uz": "Беморлар рўйхати"
  },
  "❌ Йўқ (Dashboard ичида)": {
    "en": "❌ No (inside Dashboard)",
    "ru": "❌ Нет (внутри Dashboard)",
    "uz": "❌ Йўқ (Dashboard ичида)"
  },
  "Бемор профили": {
    "en": "Patient profile",
    "ru": "Профиль пациента",
    "uz": "Бемор профили"
  },
  "Бемор дашборди": {
    "en": "Patient dashboard",
    "ru": "Панель пациента",
    "uz": "Бемор дашборди"
  },
  "❌ Йўқ": {
    "en": "❌ No",
    "ru": "❌ Нет",
    "uz": "❌ Йўқ"
  },
  "Дорилар мониторинги": {
    "en": "Medication monitoring",
    "ru": "Мониторинг лекарств",
    "uz": "Дорилар мониторинги"
  },
  "Огоҳлантиришлар": {
    "en": "Alerts",
    "ru": "Оповещения",
    "uz": "Огоҳлантиришлар"
  },
  "Аналитика": {
    "en": "Analytics",
    "ru": "Аналитика",
    "uz": "Аналитика"
  },
  "Ҳисоботлар": {
    "en": "Reports",
    "ru": "Отчёты",
    "uz": "Ҳисоботлар"
  },
  "Трансплантация киритиш": {
    "en": "Transplant entry",
    "ru": "Ввод трансплантации",
    "uz": "Трансплантация киритиш"
  },
  "Натижалар янгилаш": {
    "en": "Update outcomes",
    "ru": "Обновление исходов",
    "uz": "Натижалар янгилаш"
  },
  "Логин": {
    "en": "Login",
    "ru": "Вход",
    "uz": "Логин"
  },
  "Парол тиклаш": {
    "en": "Password reset",
    "ru": "Сброс пароля",
    "uz": "Парол тиклаш"
  },
  "Роль танлаш": {
    "en": "Role selection",
    "ru": "Выбор роли",
    "uz": "Роль танлаш"
  },
  "Саҳифалар сони": {
    "en": "Number of pages",
    "ru": "Количество страниц",
    "uz": "Саҳифалар сони"
  },
  "6 та": {
    "en": "6",
    "ru": "6",
    "uz": "6 та"
  },
  "13 та": {
    "en": "13",
    "ru": "13",
    "uz": "13 та"
  },
  "9 та": {
    "en": "9",
    "ru": "9",
    "uz": "9 та"
  },
  "АРХИТЕКТУРА ВА ФУНКЦИЯЛАР": {
    "en": "ARCHITECTURE AND FUNCTIONS",
    "ru": "АРХИТЕКТУРА И ФУНКЦИИ",
    "uz": "АРХИТЕКТУРА ВА ФУНКЦИЯЛАР"
  },
  "Кўп тиллилик (i18n)": {
    "en": "Multilingual support (i18n)",
    "ru": "Многоязычность (i18n)",
    "uz": "Кўп тиллилик (i18n)"
  },
  "Контекстлар (Context)": {
    "en": "Contexts (Context)",
    "ru": "Контексты (Context)",
    "uz": "Контекстлар (Context)"
  },
  "Маълумотлар манбаи": {
    "en": "Data source",
    "ru": "Источник данных",
    "uz": "Маълумотлар манбаи"
  },
  "Статик (src/data/)": {
    "en": "Static (src/data/)",
    "ru": "Статический (src/data/)",
    "uz": "Статик (src/data/)"
  },
  "Контекст орқали": {
    "en": "Via context",
    "ru": "Через контекст",
    "uz": "Контекст орқали"
  },
  "Аутентификация": {
    "en": "Authentication",
    "ru": "Аутентификация",
    "uz": "Аутентификация"
  },
  "❌ Йўқ (фақат UI)": {
    "en": "❌ No (UI only)",
    "ru": "❌ Нет (только UI)",
    "uz": "❌ Йўқ (фақат UI)"
  },
  "Backend интеграция": {
    "en": "Backend integration",
    "ru": "Интеграция backend",
    "uz": "Backend интеграция"
  },
  "Роллар тизими": {
    "en": "Role system",
    "ru": "Система ролей",
    "uz": "Роллар тизими"
  },
  "Тест файллар": {
    "en": "Test files",
    "ru": "Тестовые файлы",
    "uz": "Тест файллар"
  },
  "Лаборатория натижалари": {
    "en": "Laboratory results",
    "ru": "Лабораторные результаты",
    "uz": "Лаборатория натижалари"
  },
  "Тил танлагич компонент": {
    "en": "Language selector component",
    "ru": "Компонент выбора языка",
    "uz": "Тил танлагич компонент"
  },
  "КОМПОНЕНТЛАР ТУЗИЛИШИ": {
    "en": "COMPONENT STRUCTURE",
    "ru": "СТРУКТУРА КОМПОНЕНТОВ",
    "uz": "КОМПОНЕНТЛАР ТУЗИЛИШИ"
  },
  "Layout компонентлар": {
    "en": "Layout components",
    "ru": "Компоненты Layout",
    "uz": "Layout компонентлар"
  },
  "Dashboard компонентлар": {
    "en": "Dashboard components",
    "ru": "Компоненты Dashboard",
    "uz": "Dashboard компонентлар"
  },
  "Бемор компонентлар": {
    "en": "Patient components",
    "ru": "Компоненты пациента",
    "uz": "Бемор компонентлар"
  },
  "❌ Йўқ (саҳифа ичида)": {
    "en": "❌ No (inside the page)",
    "ru": "❌ Нет (внутри страницы)",
    "uz": "❌ Йўқ (саҳифа ичида)"
  },
  "UI компонентлар (Shadcn)": {
    "en": "UI components (Shadcn)",
    "ru": "Компоненты UI (Shadcn)",
    "uz": "UI компонентлар (Shadcn)"
  },
  "ДАВЛАТ/МАРКАЗ БОШҚАРУВИ": {
    "en": "COUNTRY/CENTER MANAGEMENT",
    "ru": "УПРАВЛЕНИЕ СТРАНАМИ/ЦЕНТРАМИ",
    "uz": "ДАВЛАТ/МАРКАЗ БОШҚАРУВИ"
  },
  "Давлат танлаш": {
    "en": "Country selection",
    "ru": "Выбор страны",
    "uz": "Давлат танлаш"
  },
  "✅ Ўзбекистон/Бошқа давлат": {
    "en": "✅ Uzbekistan/Other country",
    "ru": "✅ Узбекистан/Другая страна",
    "uz": "✅ Ўзбекистон/Бошқа давлат"
  },
  "Марказлар рўйхати": {
    "en": "List of centers",
    "ru": "Список центров",
    "uz": "Марказлар рўйхати"
  },
  "✅ 4 та марказ (Тошкент)": {
    "en": "✅ 4 centers (Tashkent)",
    "ru": "✅ 4 центра (Ташкент)",
    "uz": "✅ 4 та марказ (Тошкент)"
  },
  "Қўлда марказ киритиш": {
    "en": "Manual center entry",
    "ru": "Ручной ввод центра",
    "uz": "Қўлда марказ киритиш"
  },
  "✅ Бошқа давлат учун": {
    "en": "✅ For another country",
    "ru": "✅ Для другой страны",
    "uz": "✅ Бошқа давлат учун"
  },
  "Бўш жой (янги марказ)": {
    "en": "Empty slot (new center)",
    "ru": "Пустое место (новый центр)",
    "uz": "Бўш жой (янги марказ)"
  },
  "✅ Кўшимча марказ": {
    "en": "✅ Additional center",
    "ru": "✅ Дополнительный центр",
    "uz": "✅ Кўшимча марказ"
  },
  "Хусусият": {
    "en": "Feature",
    "ru": "Характеристика",
    "uz": "Хусусият"
  },
  "Жадвал нусха олинди! ✅": {
    "en": "Table copied! ✅",
    "ru": "Таблица скопирована! ✅",
    "uz": "Жадвал нусха олинди! ✅"
  },
  "# 🏥 Уч лойиҳа солиштирмаси\n\n": {
    "en": "# 🏥 Comparison of three projects\n\n",
    "ru": "# 🏥 Сравнение трёх проектов\n\n",
    "uz": "# 🏥 Уч лойиҳа солиштирмаси\n\n"
  },
  "Markdown жадвал нусха олинди! ✅": {
    "en": "Markdown table copied! ✅",
    "ru": "Таблица Markdown скопирована! ✅",
    "uz": "Markdown жадвал нусха олинди! ✅"
  },
  "🏥 Уч лойиҳа солиштирмаси": {
    "en": "🏥 Comparison of three projects",
    "ru": "🏥 Сравнение трёх проектов",
    "uz": "🏥 Уч лойиҳа солиштирмаси"
  },
  "📋 Текст нусха": {
    "en": "📋 Copy text",
    "ru": "📋 Копировать текст",
    "uz": "📋 Текст нусха"
  },
  "📝 Markdown нусха": {
    "en": "📝 Copy Markdown",
    "ru": "📝 Копировать Markdown",
    "uz": "📝 Markdown нусха"
  },
  "| Хусусият | Health C R | Dream Weaver | Transplant Guardian |\n": {
    "en": "| Feature | Health C R | Dream Weaver | Transplant Guardian |\n",
    "ru": "| Характеристика | Health C R | Dream Weaver | Transplant Guardian |\n",
    "uz": "| Хусусият | Health C R | Dream Weaver | Transplant Guardian |\n"
  }
};

export function translateDocument(text: string, lang: Language): string {
  return DOCUMENT_TEXT[text]?.[lang] ?? text;
}
