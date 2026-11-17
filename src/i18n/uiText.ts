import { useCallback } from "react";
import { useLanguage, type Language } from "@/hooks/useLanguage";

/**
 * Deterministic UI-string dictionary keyed by the source literal used in code
 * (English or Uzbek). `tx(source)` returns the text in the active language;
 * unknown strings are returned unchanged.
 */
type Entry = Record<Language, string>;

const E = (en: string, ru: string, uz: string): Entry => ({ en, ru, uz });

const ENTRIES: Entry[] = [
  E("Today", "Сегодня", "Bugun"),
  E("Try changing your search.", "Попробуйте изменить запрос.", "Qidiruv so'zini o'zgartirib ko'ring."),
  E("Full name", "Имя и фамилия", "Ism Familiya"),
  E("Email", "Электронная почта", "Elektron pochta"),
  E("Status", "Статус", "Holat"),
  E("Message", "Сообщение", "Xabar"),
  E("Subscription", "Подписка", "Obuna"),
  E("breadcrumb", "Навигационная цепочка", "Sahifa yo'li"),
  E("pagination", "Навигация по страницам", "Sahifalar bo'ylab o'tish"),
  E("Go to previous page", "Перейти на предыдущую страницу", "Oldingi sahifaga o'tish"),
  E("Go to next page", "Перейти на следующую страницу", "Keyingi sahifaga o'tish"),
  E("Bulk Entry", "Пакетный ввод", "Ommaviy kiritish"),
  E("Bulk Lab Entry — Fortis Investigation Sheet", "Пакетный ввод анализов — бланк Fortis", "Tahlillarni ommaviy kiritish — Fortis blankasi"),
  E("Add 5 Rows", "Добавить 5 строк", "5 ta qator qo'shish"),
  E("DATE", "ДАТА", "SANA"),
  E("Reference range", "Референсный диапазон", "Me'yoriy oraliq"),
  E("field(s) with unknown unit — please verify before continuing", "полей с неизвестной единицей — проверьте перед продолжением", "ta maydonning birligi noma'lum — davom etishdan oldin tekshiring"),
  E("Unit could not be determined. Please verify before continuing.", "Не удалось определить единицу. Проверьте перед продолжением.", "Birlik aniqlanmadi. Davom etishdan oldin tekshiring."),
  E("Suspicious value — please verify!", "Подозрительное значение — проверьте!", "Shubhali qiymat — tekshiring!"),
  E("Not detected — enter manually", "Не найдено — введите вручную", "Aniqlanmadi — qo'lda kiriting"),
  E("Reviewed", "Проверено", "Tekshirildi"),
  E("Review required", "Требуется проверка", "Tekshirish kerak"),
  E("Ready", "Готово", "Tayyor"),
  E("required", "обязательных", "ta majburiy"),
  E("Report", "Отчёт", "Hisobot"),
  E("DOB", "Дата рождения", "Tug'ilgan sana"),
  E("Choose 1–5 files", "Выберите 1–5 файлов", "1–5 ta fayl tanlang"),
  E("I have verified this report belongs to the current patient (override will be audited).", "Я проверил, что отчёт принадлежит этому пациенту (действие будет записано в журнал).", "Hisobot shu bemorga tegishli ekanini tekshirdim (bu amal qayd etiladi)."),
  E("Select a new role. The previous role will be removed.", "Выберите новую роль. Предыдущая роль будет удалена.", "Yangi rolni tanlang. Eski rol olib tashlanadi."),
  E("Uzbekistan", "Узбекистан", "O'zbekiston"),
  E("India", "Индия", "Hindiston"),
  E("Chronic", "Хроническое", "Surunkali"),
  E("Unknown", "Неизвестно", "Noma'lum"),
  E("Snapshots", "Оценки риска", "Xavf baholari"),
  E("Close", "Закрыть", "Yopish"),
  E("More", "Ещё", "Yana"),
  E("Previous", "Назад", "Oldingi"),
  E("Next", "Далее", "Keyingi"),
  E("More pages", "Другие страницы", "Boshqa sahifalar"),
  E("Previous slide", "Предыдущий слайд", "Oldingi slayd"),
  E("Next slide", "Следующий слайд", "Keyingi slayd"),
  E("Toggle Sidebar", "Переключить боковую панель", "Yon menyuni ochish yoki yopish"),
  E("Stable", "Стабильно", "Barqaror"),
  // App / NotFound / SelectRole
  E("Loading...", "Загрузка...", "Yuklanmoqda..."),
  E("Oops! Page not found", "Упс! Страница не найдена", "Kechirasiz! Sahifa topilmadi"),
  E("Return to Home", "Вернуться на главную", "Bosh sahifaga qaytish"),
  E("Welcome to TransplantCare", "Добро пожаловать в TransplantCare", "TransplantCare'ga xush kelibsiz"),
  E("Confirm your role to continue", "Подтвердите роль, чтобы продолжить", "Davom etish uchun rolingizni tasdiqlang"),
  E("Continue as a patient", "Продолжить как пациент", "Bemor sifatida davom etish"),
  E("Patient Portal", "Портал пациента", "Bemor portali"),
  E("Doctor / Healthcare Provider", "Врач / Медработник", "Shifokor / Tibbiyot xodimi"),
  E("Support", "Поддержка", "Yordamchi"),
  E("Administrator", "Администратор", "Administrator"),
  E("View your health status, lab results, and care timeline", "Состояние здоровья, анализы и план наблюдения", "Sog'liq holati, tahlil natijalari va kuzatuv rejasi"),
  E("Manage patients, review risks, and oversee transplant care", "Ведение пациентов, оценка рисков и контроль трансплантации", "Bemorlarni boshqarish, xavflarni ko'rib chiqish va transplant kuzatuvi"),
  E("Help users with issues and manage support requests", "Помощь пользователям и обработка обращений", "Foydalanuvchilarga yordam va murojaatlarni boshqarish"),
  E("Full system management, users and settings", "Полное управление системой, пользователями и настройками", "Tizim, foydalanuvchilar va sozlamalarni to'liq boshqarish"),
  E("Each account has only one role. Confirm your role to continue.", "Каждая учётная запись имеет только одну роль. Подтвердите роль, чтобы продолжить.", "Har bir hisob faqat bitta rolga ega. Davom etish uchun rolingizni tasdiqlang."),
  // AdminUsers
  E("Doctor", "Врач", "Shifokor"),
  E("Support", "Поддержка", "Yordamchi"),
  E("Patient", "Пациент", "Bemor"),
  E("Users", "Пользователи", "Foydalanuvchilar"),
  E("Manage system users and their roles. Administrators only.", "Управление пользователями и их ролями. Только для администраторов.", "Tizim foydalanuvchilari va ularning rollarini boshqarish. Faqat administratorlar uchun."),
  E("Role updated", "Роль обновлена", "Rol yangilandi"),
  E("User role changed successfully.", "Роль пользователя успешно изменена.", "Foydalanuvchi roli muvaffaqiyatli o'zgartirildi."),
  E("Error", "Ошибка", "Xatolik"),
  E("Email confirmed", "Email подтверждён", "Email tasdiqlandi"),
  E("User email marked as confirmed.", "Email пользователя отмечен как подтверждённый.", "Foydalanuvchi emaili tasdiqlangan deb belgilandi."),
  E("Password must be at least 8 characters.", "Пароль должен содержать не менее 8 символов.", "Parol kamida 8 belgidan iborat bo'lishi kerak."),
  E("Password is too long.", "Пароль слишком длинный.", "Parol juda uzun."),
  E("Passwords do not match.", "Пароли не совпадают.", "Parollar mos kelmadi."),
  E("Password updated", "Пароль обновлён", "Parol yangilandi"),
  E("The user can sign in with the new password.", "Пользователь может войти с новым паролем.", "Foydalanuvchi yangi parol bilan kira oladi."),
  E("Search by email or name", "Поиск по email или имени", "Email yoki ism bo'yicha qidirish"),
  E("All roles", "Все роли", "Barcha rollar"),
  E("No role assigned", "Роль не назначена", "Rol berilmagan"),
  E("No users found", "Пользователи не найдены", "Foydalanuvchi topilmadi"),
  E("Try changing the search or filter.", "Измените условия поиска или фильтра.", "Qidiruv yoki filtr shartlarini o'zgartirib ko'ring."),
  E("Name", "Имя", "Ism"),
  E("Role", "Роль", "Rol"),
  E("Actions", "Действия", "Amallar"),
  E("Actions", "Действие", "Amal"),
  E("Email confirmed", "Email подтверждён", "Email tasdiqlangan"),
  E("Last sign-in", "Последний вход", "Oxirgi kirish"),
  E("Registered", "Зарегистрирован", "Ro'yxatdan o'tgan"),
  E("(you)", "(вы)", "(siz)"),
  E("Yes", "Да", "Ha"),
  E("No", "Нет", "Yo'q"),
  E("Confirm email", "Подтвердить email", "Emailni tasdiqlash"),
  E("Reset password", "Сбросить пароль", "Parolni tiklash"),
  E("You cannot change your own role", "Нельзя изменить собственную роль", "O'z rolingizni o'zgartirish mumkin emas"),
  E("Change role", "Изменить роль", "Rolni o'zgartirish"),
  E("Cancel", "Отмена", "Bekor qilish"),
  E("Saving...", "Сохранение...", "Saqlanmoqda..."),
  E("Save", "Сохранить", "Saqlash"),
  E("Confirm this email as an administrator? The user will be able to sign in without email verification.", "Подтвердить этот email как администратор? Пользователь сможет войти без подтверждения по почте.", "Bu emailni administrator sifatida tasdiqlaysizmi? Foydalanuvchi email tasdiqlashsiz tizimga kira oladi."),
  E("Confirming...", "Подтверждение...", "Tasdiqlanmoqda..."),
  E("Confirm", "Подтвердить", "Tasdiqlash"),
  E("— enter a new password.", "— введите новый пароль.", "uchun yangi parol kiriting."),
  E("New password", "Новый пароль", "Yangi parol"),
  E("Confirm password", "Подтвердите пароль", "Parolni tasdiqlang"),
  E("Hide password", "Скрыть пароль", "Parolni yashirish"),
  E("Show password", "Показать пароль", "Parolni ko'rsatish"),
  // Lab upload / bulk entry / history
  E("Detected", "Найдено", "Aniqlandi"),
  E("Not detected", "Не найдено", "Aniqlanmadi"),
  E("⚠ Patient identity mismatch", "⚠ Несовпадение данных пациента", "⚠ Bemor ma'lumotlari mos emas"),
  E("This report may belong to another patient. Please verify before continuing.", "Этот отчёт может принадлежать другому пациенту. Проверьте перед продолжением.", "Bu hisobot boshqa bemorga tegishli bo'lishi mumkin. Davom etishdan oldin tekshiring."),
  E("Blocked: identity mismatch", "Заблокировано: несовпадение данных", "Bloklandi: shaxs ma'lumotlari mos emas"),
  E("This report may belong to another patient. Please confirm override before saving.", "Этот отчёт может принадлежать другому пациенту. Подтвердите перед сохранением.", "Bu hisobot boshqa bemorga tegishli bo'lishi mumkin. Saqlashdan oldin tasdiqlang."),
  E("Verification incomplete", "Проверка не завершена", "Tekshiruv yakunlanmagan"),
  E("field(s) still require review before saving.", "пол(я) требуют проверки перед сохранением.", "ta maydon saqlashdan oldin tekshirilishi kerak."),
  E("Patient identity could not be verified from this report.", "Не удалось подтвердить личность пациента по этому отчёту.", "Bu hisobotdan bemor shaxsini tasdiqlab bo'lmadi."),
  E(" · No stored patient identity available for comparison.", " · Нет сохранённых данных пациента для сравнения.", " · Solishtirish uchun saqlangan bemor ma'lumotlari yo'q."),
  E("No identity block detected on report", "В отчёте не найдены данные пациента", "Hisobotda bemor ma'lumotlari topilmadi"),
  E("Identity match", "Личность совпадает", "Shaxs mos keldi"),
  E("Identity could not be confirmed", "Личность не подтверждена", "Shaxsni tasdiqlab bo'lmadi"),
  E("Validation errors", "Ошибки проверки", "Tekshiruv xatolari"),
  E("Fix highlighted cells", "Исправьте выделенные ячейки", "Belgilangan kataklarni tuzating"),
  E("No data", "Нет данных", "Ma'lumot yo'q"),
  E("Enter at least one row", "Введите хотя бы одну строку", "Kamida bitta qator kiriting"),
  E("Finalizing...", "Завершение...", "Yakunlanmoqda..."),
  E("lab result(s) saved", "результат(ов) сохранено", "ta tahlil saqlandi"),
  E("row(s) failed", "строк(и) с ошибкой", "ta qatorda xato"),
  E("No rows were saved. Check console for details.", "Ни одна строка не сохранена.", "Hech bir qator saqlanmadi."),
  E("Saving...", "Сохранение...", "Saqlanmoqda..."),
  E("Save All", "Сохранить всё", "Hammasini saqlash"),
  E("Deletion cancelled: reason required", "Удаление отменено: нужна причина", "O'chirish bekor qilindi: sabab ko'rsatilishi kerak"),
  E("Tacrolimus, Prednisone...", "Такролимус, Преднизолон...", "Takrolimus, Prednizolon..."),
  // AI chat
  E("Auth error", "Ошибка авторизации", "Avtorizatsiya xatosi"),
  E("Please sign in again", "Пожалуйста, войдите снова", "Iltimos, qayta kiring"),
  E("Rate limit", "Лимит запросов", "So'rovlar chegarasi"),
  E("AI credits exhausted", "Кредиты AI исчерпаны", "AI kreditlari tugadi"),
  E("Chat error", "Ошибка чата", "Suhbat xatosi"),
  E("Network error", "Ошибка сети", "Tarmoq xatosi"),
  E("Unknown error", "Неизвестная ошибка", "Noma'lum xato"),
  // Priority / prediction
  E("Overdue lab tests", "Просроченные анализы", "Muddati o'tgan tahlillar"),
  E("Medium risk", "Средний риск", "O'rta xavf"),
  E("Prediction unavailable — manual clinical review required", "Прогноз недоступен — требуется ручная клиническая оценка", "Bashorat mavjud emas — shifokor ko'rigi talab qilinadi"),
  E("Insufficient lab data — manual clinical review required", "Недостаточно анализов — требуется ручная клиническая оценка", "Tahlillar yetarli emas — shifokor ko'rigi talab qilinadi"),
];

const INDEX = new Map<string, Entry>();
for (const e of ENTRIES) {
  for (const v of [e.en, e.uz]) if (!INDEX.has(v)) INDEX.set(v, e);
}

export function translateUi(source: string, lang: Language): string {
  const hit = INDEX.get(source);
  if (hit) return hit[lang];
  const mrn = source.match(/^MRN (match|mismatch): (.*)$/s);
  if (mrn) return lang === "uz" ? `Bemor raqami ${mrn[1] === "match" ? "mos" : "mos emas"}: ${mrn[2].replace("report=", "hisobot=").replace(" vs patient=", "; bemor=")}`
    : lang === "ru" ? `Номер пациента ${mrn[1] === "match" ? "совпадает" : "не совпадает"}: ${mrn[2].replace("report=", "отчёт=").replace(" vs patient=", "; пациент=")}` : source;
  const nameDob = source.match(/^Name "(.*)" and DOB "(.*)" don't match patient "(.*)" \/ (.*)$/s);
  if (nameDob) return lang === "uz" ? `Hisobotdagi ism "${nameDob[1]}" va tug'ilgan sana "${nameDob[2]}" bemor "${nameDob[3]}" / ${nameDob[4]} bilan mos emas`
    : lang === "ru" ? `Имя "${nameDob[1]}" и дата рождения "${nameDob[2]}" не совпадают с пациентом "${nameDob[3]}" / ${nameDob[4]}` : source;
  const name = source.match(/^Name "(.*)" does not match patient "(.*)"$/s);
  if (name) return lang === "uz" ? `Hisobotdagi ism "${name[1]}" bemor "${name[2]}" bilan mos emas` : lang === "ru" ? `Имя "${name[1]}" не совпадает с пациентом "${name[2]}"` : source;
  const country = source.match(/^(Creatinine|Bilirubin) unit (.*) \((O'zbekiston|India)\)$/);
  if (country) return lang === "uz" ? `${country[1] === "Creatinine" ? "Kreatinin" : "Bilirubin"} birligi ${country[2]} (${translateUi(country[3] === "India" ? "India" : "Uzbekistan", lang)})`
    : lang === "ru" ? `Единица ${country[1] === "Creatinine" ? "креатинина" : "билирубина"}: ${country[2]} (${translateUi(country[3] === "India" ? "India" : "Uzbekistan", lang)})` : source;
  const missed = source.match(/^Missed medication (\d+) days$/);
  if (missed) {
    const n = missed[1];
    return lang === "ru" ? `Пропуск лекарств ${n} дн.` : lang === "uz" ? `${n} kun dori o'tkazib yuborilgan` : source;
  }
  return source;
}

export function getStoredUiLang(): Language {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem("app-lang") : null;
  return saved === "en" || saved === "ru" || saved === "uz" ? saved : "en";
}

export function useTx(): (source: string) => string {
  const { lang } = useLanguage();
  return useCallback((source: string) => translateUi(source, lang), [lang]);
}
