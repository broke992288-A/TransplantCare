# Authentication / Password Reset архитектураси — таҳлил ва кейинги қадамлар

## 1. Ҳозирги ҳолат (кодда текширилди)

**Auth тизими: Lovable Cloud Auth (Supabase Auth) — email+пароль.** Custom backend йўқ.

- Кириш: `src/pages/Login.tsx` → `useAuth.signIn` → `authService.signInWithPassword` → Cloud Auth `signInWithPassword`.
- Телефон билан кириш ҳақиқий SMS auth эмас: телефон рақами `phoneToEmail()` орқали `<рақам>@phone.transplantcare` кўринишидаги сохта email га айлантирилади, яъни барибир email+пароль.
- "Forgot password": `resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })`.
- `/reset-password` саҳифаси мавжуд ва `updateUser({ password })` чақиради — оқим тўғри қурилган.

**Хат ҳозир қандай кетади:** реал email бор фойдаланувчиларга Lovable Cloud Auth нинг **стандарт (default) юборувчиси** орқали, стандарт шаблон билан, TransplantCare брендисиз. Лойиҳада ҳеч қандай email функцияси ёки auth email шаблони йўқ (`supabase/functions/` да email жўнатувчи функция мавжуд эмас), email домен ҳам ҳали созилмаган.

**Икки муҳим камчилик:**
1. Телефон орқали рўйхатдан ўтган фойдаланувчиларнинг манзили сохта (`@phone.transplantcare`) — уларга пароль тиклаш хати **принципиал жиҳатдан етиб бормайди**.
2. Брендли (TransplantCare) хат ва ишончли етказиб бериш учун ўз домени билан созланган email инфратузилмаси керак.

## 2. Resend connection ҳақида

`AbdulHayot's Resend (1)` лойиҳага уланган (ключ backend да мавжуд). Лекин муҳим нуқта: **Cloud Auth нинг пароль тиклаш хатини Resend автоматик олиб кетмайди.** Auth хатлари учун тўғри ва қўлланадиган йўл — Lovable Emails (ўз домен + бошқарилувчи auth шаблонлар). Resend эса илова хатлари (билдиришнома, форма тасдиқлари ва ҳ.к.) учун қулай.

## 3. Тавсия этилган архитектура

```text
Login / Forgot password  →  Cloud Auth (recovery token яратади)
                                   ↓
                     Auth email hook + брендли шаблон
                                   ↓
                 transplantcare.uz домени орқали жўнатиш
                                   ↓
          Фойдаланувчи → /reset-password → янги пароль
```

Resend: илова (транзакцион) хатлари учун — auth оқимидан ажратилган ҳолда.

## 4. Кейинги қадамлар (тасдиқлашингиздан кейин)

1. **Email домен созлаш** — `transplantcare.uz` (ёки `mail.transplantcare.uz`) учун email setup ойнасини очиш, DNS ёзувларини қўшиш ва тасдиқлашни кутиш. Бу қадамни фақат Сиз бажарасиз (домен эгаси).
2. **Брендли auth шаблонларини яратиш** — пароль тиклаш, email тасдиқлаш, magic link ва бошқалар; TransplantCare ранглари, 3 тилда (UZ/RU/EN) матн.
3. **Auth email hook ни деплой қилиш** ва тест хат юбориб текшириш.
4. **Телефонли аккаунтлар масаласи** — қарор керак: (а) телефонли фойдаланувчилардан реал email сўраш, (б) пароль тиклашни шифокор/админ орқали қилиш, ёки (в) SMS/Telegram орқали тиклаш. Ҳозир бу гуруҳ учун "Forgot password" ишламайди.
5. **Ихтиёрий:** Resend орқали илова хатлари (масалан, таҳлил эслатмаси, шифокор билдиришномаси) — агар хоҳласангиз.

## 5. Сўровлар

- Домен: `transplantcare.uz` дан юборамизми, ёки субдомен (`mail.transplantcare.uz`) афзалми?
- Юборувчи манзил ва номи қандай бўлсин (масалан, `noreply@transplantcare.uz`, "TransplantCare")?
- Телефонли аккаунтлар учун 4-бандда қайси вариантни танлайсиз?
