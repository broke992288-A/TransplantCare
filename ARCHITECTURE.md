# TransplantCare — Техник архитектура

## Умумий кўриниш

TransplantCare — транспланация беморларини кузатиш учун клиник даражадаги веб-платформа.

## Технологиялар

| Қатлам | Технология |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + Radix |
| State | TanStack React Query |
| Backend | Lovable Cloud (Supabase) |
| Edge Functions | Deno (5 функция) |
| PWA | vite-plugin-pwa + Workbox |
| Mobile | Capacitor (Android/iOS) |
| Charts | Recharts |
| AI | OpenAI GPT-5-mini (OCR), Lovable AI |

## Лойиҳа структураси

```
src/
├── components/
│   ├── features/    # Бизнес-логика компонентлари (28 та)
│   ├── layout/      # DashboardLayout, Sidebar, TopHeader
│   └── ui/          # shadcn/ui компонентлари (50+ та)
├── hooks/           # React хуклар (16 та)
├── services/        # API сервислари (15 та)
├── utils/           # Утилитлар (8 та)
├── pages/           # Саҳифалар (18 та)
├── types/           # TypeScript типлар
└── data/            # Статик маълумотлар
```

## Маълумотлар базаси (13 жадвал)

- `patients` — беморлар рўйхати
- `lab_results` — 29 та клиник кўрсаткич
- `risk_snapshots` — хавф баҳолаш тарихи
- `patient_alerts` — огоҳлантиришлар
- `medications` — дорилар
- `medication_adherence` — дори қабул қилиш
- `medication_changes` — доза ўзгаришлари
- `clinical_thresholds` — клиник меъёрлар (KDIGO/AASLD)
- `lab_schedules` — таҳлил жадвали
- `transplant_episodes` — трансплантация эпизодлари
- `patient_events` — воқеалар тарихи
- `audit_logs` — аудит логлари
- `user_roles` — фойдаланувчи роллари

## Хавфсизлик

- **RBAC**: `admin`, `doctor`, `patient`, `support` роллари
- **RLS**: 48 та Row-Level Security қоидаси
- **JWT**: Автоматик янгиланувчи сессиялар
- **Сессия таймаут**: 30 дақиқа ҳаракатсизликдан кейин

## Риск алгоритми

- **Буйрак**: KDIGO 2024 (Cr, eGFR, протеинурия, калий, такролимус)
- **Жигар**: AASLD 2023 (ALT, AST, билирубин, GGT, ALP, такролимус)
- **Тренд таҳлил**: Сўнгги 5 та таҳлил бўйича ўзгариш тезлигини аниқлаш
- **Балл**: 0–100 шкала → `low` (<30), `medium` (30–59), `high` (≥60)

## Edge Functions

| Функция | Вазифа |
|---------|--------|
| `ocr-lab-report` | AI орқали таҳлил натижаларини ўқиш |
| `predict-rejection` | Режекция эҳтимолини башорат қилиш |
| `recalculate-risk` | Хавф балини қайта ҳисоблаш |
| `translate-text` | Ўзбек↔Рус↔Инглиз таржима |
| `system-health` | Тизим ҳолатини текшириш |

## PWA ва мобил

- Офлайн кэшлаш: JS, CSS, HTML, расмлар
- Service Worker: `autoUpdate` режими
- Capacitor: Android APK ва iOS IPA учун тайёр
